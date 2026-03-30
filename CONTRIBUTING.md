# Contributing to AHWR Public User UI

## Coding Standard

- The code needs to adhere to the [Defra JavaScript Standards](https://defra.github.io/software-development-standards/standards/javascript_standards/)
- Use [neostandard](https://github.com/neostandard/neostandard) to lint your code
- Do not use front end JavaScript frameworks

## Commit Messages

Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).

By default, a commit into the trunk will cause a `minor` version increment. If you need either a `major` or `patch` version, append `#major` or `#patch` to the commit message.

## Integration Tests

- Validate the HTML is WCAG compliant the using the assertion `toHaveNoViolations`
