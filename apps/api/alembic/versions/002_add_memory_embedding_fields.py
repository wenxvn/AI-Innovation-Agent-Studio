"""add memory embedding fields

Revision ID: 002
Revises: 001
Create Date: 2026-05-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('memories', sa.Column('embedding', sa.JSON(), nullable=True))
    op.add_column('memories', sa.Column('embedding_model', sa.String(100), server_default=''))
    op.add_column('memories', sa.Column('embedding_status', sa.String(50), server_default='pending'))
    op.add_column('memories', sa.Column('last_embedded_at', sa.DateTime(timezone=True), nullable=True))

    op.add_column('generated_outputs', sa.Column('content_type', sa.String(50), server_default='markdown'))
    op.add_column('generated_outputs', sa.Column('language', sa.String(50), server_default=''))
    op.add_column('generated_outputs', sa.Column('file_name', sa.String(500), server_default=''))

    op.add_column('agent_runs', sa.Column('workflow_stage', sa.String(100), server_default=''))
    op.add_column('agent_runs', sa.Column('intent', sa.String(100), server_default=''))
    op.add_column('agent_runs', sa.Column('intent_confidence', sa.Float(), server_default='0'))
    op.add_column('agent_runs', sa.Column('intent_reason', sa.Text(), server_default=''))


def downgrade() -> None:
    op.drop_column('agent_runs', 'intent_reason')
    op.drop_column('agent_runs', 'intent_confidence')
    op.drop_column('agent_runs', 'intent')
    op.drop_column('agent_runs', 'workflow_stage')

    op.drop_column('generated_outputs', 'file_name')
    op.drop_column('generated_outputs', 'language')
    op.drop_column('generated_outputs', 'content_type')

    op.drop_column('memories', 'last_embedded_at')
    op.drop_column('memories', 'embedding_status')
    op.drop_column('memories', 'embedding_model')
    op.drop_column('memories', 'embedding')
