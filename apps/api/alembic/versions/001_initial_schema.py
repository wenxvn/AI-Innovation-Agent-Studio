"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-21
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        'projects',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), server_default=''),
        sa.Column('goal', sa.Text(), server_default=''),
        sa.Column('status', sa.String(50), server_default='active'),
        sa.Column('current_stage', sa.String(100), server_default='ideation'),
        sa.Column('tech_stack', sa.JSON(), server_default='[]'),
        sa.Column('progress', sa.Integer(), server_default='0'),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'skills',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('description', sa.Text(), server_default=''),
        sa.Column('version', sa.String(50), server_default='0.1.0'),
        sa.Column('trigger', sa.JSON(), server_default='[]'),
        sa.Column('inputs', sa.JSON(), server_default='[]'),
        sa.Column('outputs', sa.JSON(), server_default='[]'),
        sa.Column('tools', sa.JSON(), server_default='[]'),
        sa.Column('permissions', sa.JSON(), server_default='{}'),
        sa.Column('requires_approval', sa.Boolean(), server_default='false'),
        sa.Column('is_enabled', sa.Boolean(), server_default='true'),
        sa.Column('author', sa.String(255), server_default='System'),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_skills_name', 'skills', ['name'])

    op.create_table(
        'documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=False),
        sa.Column('file_size', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(50), server_default='uploaded'),
        sa.Column('summary', sa.Text(), server_default=''),
        sa.Column('chunk_count', sa.Integer(), server_default='0'),
        sa.Column('embedding_status', sa.String(50), server_default='pending'),
        sa.Column('embedding_provider', sa.String(50), server_default=''),
        sa.Column('embedding_model', sa.String(100), server_default=''),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_documents_project_id', 'documents', ['project_id'])

    op.create_table(
        'memories',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('memory_type', sa.String(50), server_default='project'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='1.0'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_stale', sa.Boolean(), server_default='false'),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_memories_project_id', 'memories', ['project_id'])

    op.create_table(
        'agent_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_name', sa.String(255), server_default='Orchestrator Agent'),
        sa.Column('status', sa.String(50), server_default='idle'),
        sa.Column('user_input', sa.Text(), server_default=''),
        sa.Column('selected_skill', sa.String(255), server_default=''),
        sa.Column('plan', sa.JSON(), server_default='[]'),
        sa.Column('context_pack', sa.JSON(), server_default='{}'),
        sa.Column('generated_output', sa.JSON(), server_default='{}'),
        sa.Column('eval_result', sa.JSON(), server_default='{}'),
        sa.Column('token_usage', sa.JSON(), server_default='{}'),
        sa.Column('latency_ms', sa.Integer(), server_default='0'),
        sa.Column('cost', sa.Float(), server_default='0'),
        sa.Column('error_message', sa.Text(), server_default=''),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_agent_runs_project_id', 'agent_runs', ['project_id'])

    op.create_table(
        'generated_outputs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_run_id', sa.String(36), sa.ForeignKey('agent_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('output_type', sa.String(100), server_default='document'),
        sa.Column('title', sa.String(500), server_default='Untitled'),
        sa.Column('content', sa.Text(), server_default=''),
        sa.Column('version', sa.Integer(), server_default='1'),
        sa.Column('created_by_agent', sa.String(255), server_default=''),
        sa.Column('status', sa.String(50), server_default='draft'),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_generated_outputs_project_id', 'generated_outputs', ['project_id'])
    op.create_index('ix_generated_outputs_agent_run_id', 'generated_outputs', ['agent_run_id'])

    op.create_table(
        'evaluations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_run_id', sa.String(36), sa.ForeignKey('agent_runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Float(), server_default='0'),
        sa.Column('rubric', sa.JSON(), server_default='{}'),
        sa.Column('result', sa.String(50), server_default='pending'),
        sa.Column('feedback', sa.Text(), server_default=''),
        sa.Column('risks', sa.JSON(), server_default='[]'),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_evaluations_project_id', 'evaluations', ['project_id'])
    op.create_index('ix_evaluations_agent_run_id', 'evaluations', ['agent_run_id'])

    op.create_table(
        'tool_calls',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_run_id', sa.String(36), sa.ForeignKey('agent_runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tool_name', sa.String(255), nullable=False),
        sa.Column('input_params', sa.JSON(), server_default='{}'),
        sa.Column('output_result', sa.JSON(), server_default='{}'),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('permission_level', sa.String(50), server_default='low'),
        sa.Column('requires_approval', sa.Boolean(), server_default='false'),
        sa.Column('approved_by', sa.String(255), server_default=''),
        sa.Column('latency_ms', sa.Integer(), server_default='0'),
        sa.Column('error_message', sa.Text(), server_default=''),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_tool_calls_project_id', 'tool_calls', ['project_id'])
    op.create_index('ix_tool_calls_agent_run_id', 'tool_calls', ['agent_run_id'])

    op.create_table(
        'trace_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_id', sa.String(36), sa.ForeignKey('agent_runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('title', sa.String(500), server_default=''),
        sa.Column('message', sa.Text(), server_default=''),
        sa.Column('status', sa.String(50), server_default='info'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('latency_ms', sa.Integer(), server_default='0'),
        sa.Column('input', sa.JSON(), server_default='{}'),
        sa.Column('output', sa.JSON(), server_default='{}'),
        sa.Column('error', sa.JSON(), server_default='{}'),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_trace_events_project_id', 'trace_events', ['project_id'])
    op.create_index('ix_trace_events_run_id', 'trace_events', ['run_id'])

    op.create_table(
        'document_chunks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('token_count', sa.Integer(), server_default='0'),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('embedding_provider', sa.String(50), server_default=''),
        sa.Column('embedding_model', sa.String(100), server_default=''),
        sa.Column('embedding_mode', sa.String(20), server_default=''),
        sa.Column('source_page', sa.Integer(), nullable=True),
        sa.Column('source_section', sa.String(500), server_default=''),
        sa.Column('metadata', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])
    op.create_index('ix_document_chunks_project_id', 'document_chunks', ['project_id'])


def downgrade() -> None:
    op.drop_table('document_chunks')
    op.drop_table('trace_events')
    op.drop_table('tool_calls')
    op.drop_table('evaluations')
    op.drop_table('generated_outputs')
    op.drop_table('agent_runs')
    op.drop_table('memories')
    op.drop_table('documents')
    op.drop_table('skills')
    op.drop_table('projects')
