import time
import json
import httpx
from app.schemas.llm import LLMResult, TokenUsage


class DeepSeekLLMProvider:
    def __init__(self, api_key: str, model: str = "deepseek-chat", base_url: str = "https://api.deepseek.com/v1", timeout: int = 60):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.timeout = timeout

    async def generate(
        self,
        messages: list[dict],
        response_format: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
        metadata: dict | None = None,
    ) -> LLMResult:
        start = time.time()
        body: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens
        if response_format == "json":
            body["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                resp.raise_for_status()
                data = resp.json()

            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            raw_parsed = None
            if response_format == "json":
                try:
                    raw_parsed = json.loads(content)
                except json.JSONDecodeError:
                    raw_parsed = {"raw_text": content}

            return LLMResult(
                content=content,
                raw=raw_parsed or data,
                provider="deepseek",
                model=self.model,
                mode="real",
                token_usage=TokenUsage(
                    input_tokens=usage.get("prompt_tokens", 0),
                    output_tokens=usage.get("completion_tokens", 0),
                    total_tokens=usage.get("total_tokens", 0),
                ),
                latency_ms=int((time.time() - start) * 1000),
                finish_reason=data["choices"][0].get("finish_reason", "stop"),
                error=None,
            )
        except httpx.TimeoutException:
            return LLMResult(
                content="",
                raw={},
                provider="deepseek",
                model=self.model,
                mode="real",
                latency_ms=int((time.time() - start) * 1000),
                error=f"Request timed out after {self.timeout}s",
            )
        except httpx.HTTPStatusError as e:
            return LLMResult(
                content="",
                raw={"status": e.response.status_code, "body": e.response.text},
                provider="deepseek",
                model=self.model,
                mode="real",
                latency_ms=int((time.time() - start) * 1000),
                error=f"HTTP {e.response.status_code}: {e.response.text[:200]}",
            )
        except Exception as e:
            return LLMResult(
                content="",
                raw={},
                provider="deepseek",
                model=self.model,
                mode="real",
                latency_ms=int((time.time() - start) * 1000),
                error=str(e),
            )
