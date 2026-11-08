# Spec Delta

## Purpose

Covers what the group board requires of group standing — one added requirement on who
may open a group's board. All other group requirements are unchanged.

## ADDED Requirements

### Requirement: The group board follows the same standing rules

The system SHALL treat the group board as a group read: opening it requires an active
membership in the group and nothing more, and no elevated role is required to view it.

#### Scenario: No role needed to watch the board

- **WHEN** an active `member` (not logger, not owner) opens their group's board
- **THEN** it renders normally; the visibility filter — not the role — decides what the
  viewer receives
