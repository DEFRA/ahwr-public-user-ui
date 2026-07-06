# Poultry Implementation Strategy

Date: 2026-03-20

## Status

Accepted

## Context

Due to time constraints, we need to rapidly develop the poultry scheme whilst avoiding any regressions to the existing livestock scheme.

## Decision

- Create new routes for the poultry journey, which are prefixed with `poultry`
- Separate poultry claim and application data in the session from livestock
- Model poultry within the existing concept of a herd.
- The reporting will build upon the existing foundation we already have, reusing concepts where possible, and introducing the following new columns for poultry: typesOfPoultry, biosecurityChanges, biosecurityChangesCost, poultryAssuranceScheme, schemeExperienceInterview

## Consequences

- No regressions are introduced into the existing livestock journey
- Duplication of code in the poultry and livestock journeys
- The concept of a "site" in the domain model is mapped to a `herd` in the data model and the reporting events, which could cause some confusion
