from app.db.base import Base
from app.db.session import engine
from app.models import project, document, memory, skill, agent_run, tool_call, evaluation, output, trace_event


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("Done.")
