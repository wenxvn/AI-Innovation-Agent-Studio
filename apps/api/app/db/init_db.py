import logging
from app.db.base import Base
from app.db.session import engine
from app.models import project, document, memory, skill, agent_run, tool_call, evaluation, output, trace_event

logger = logging.getLogger(__name__)


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.warning("Database connection failed: %s. Tables will be created on first successful connection.", str(e))


if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("Done.")
