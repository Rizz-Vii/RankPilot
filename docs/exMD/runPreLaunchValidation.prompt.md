---
mode: agent
---

# Run RankPilot Pre-Launch Validation

This prompt executes the RankPilot pre-launch validation protocol to ensure the application is production-ready.

## Instructions

1. Run the pre-launch validation script to verify all systems and features
2. The script will perform both automated and manual testing steps
3. A comprehensive report will be generated upon completion

## Execution Command

```powershell
# Start the pre-launch validation process
.\scripts\pre-launch-validation.ps1
```

## Expected Output

The script will:

1. Check environment setup (dev server, Firebase, environment variables)
2. Validate dependencies (packages, TypeScript, build, linting)
3. Test authentication and tier-based access
4. Validate the NeuroSEO™ Suite functionality
5. Test the enhanced navigation system
6. Validate mobile performance and accessibility
7. Test subscription and billing systems
8. Run the comprehensive test suite
9. Validate performance and security
10. Review documentation
11. Check deployment readiness
12. Prepare for final launch

A detailed report will be generated at `d:\GitHUB\studio\pre-launch-validation-report.md` with:

- Test results summary
- Passed/warning/failed counts
- Launch readiness status
- Recommendations for any failed tests

## Success Criteria

The validation is successful when:

- All critical tests pass
- No security vulnerabilities are found
- NeuroSEO™ Suite functions correctly across all tiers
- Mobile performance meets Core Web Vitals targets
- All 153 tests pass successfully
- Documentation is current
- Firebase deployment succeeds

## Notes

- For manual validation steps, you'll be prompted to confirm if tests pass
- You can skip tests with the 's' option if needed
- The process takes approximately 60-90 minutes to complete
- Have test user credentials ready for tier-based testing
