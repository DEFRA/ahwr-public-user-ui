# Poultry Implementation Strategy

Date: 2026-03-20

## Status

Accepted

## Context

Due to time constraints, we need to rapidly develop the poultry scheme whilst avoiding any regressions to the existing livestock scheme.

## Decision

- Create new routes for the poultry journey, which are prefixed with `poultry`
- Separate poultry claim and application data in the session from livestock

## Consequences

- No regressions are introduced into the existing livestock journey
- Duplication of code in the poultry and livestock journeys
