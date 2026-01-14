-- Migration: Add More Board Templates
-- Adds 2 additional templates: Project Management and Sales Pipeline

INSERT INTO board_templates (name, description, icon, is_public, statuses) VALUES
(
    'Project Management',
    'Comprehensive project tracking with planning and execution phases',
    '📊',
    true,
    '[
        {"name": "Planning", "color": "#8B5CF6", "order": 0},
        {"name": "Ready to Start", "color": "#6B7280", "order": 1},
        {"name": "In Progress", "color": "#3B82F6", "order": 2},
        {"name": "Review", "color": "#F59E0B", "order": 3},
        {"name": "Testing", "color": "#EC4899", "order": 4},
        {"name": "Completed", "color": "#22C55E", "order": 5}
    ]'::jsonb
),
(
    'Sales Pipeline',
    'Track leads and opportunities through your sales process',
    '💰',
    true,
    '[
        {"name": "Lead", "color": "#EC4899", "order": 0},
        {"name": "Qualified", "color": "#8B5CF6", "order": 1},
        {"name": "Proposal", "color": "#3B82F6", "order": 2},
        {"name": "Negotiation", "color": "#F59E0B", "order": 3},
        {"name": "Closed Won", "color": "#22C55E", "order": 4},
        {"name": "Closed Lost", "color": "#EF4444", "order": 5}
    ]'::jsonb
)
ON CONFLICT DO NOTHING;
