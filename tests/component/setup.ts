/**
 * Setup for the `component` jest project only (see jest.config.ts).
 *
 * Deliberately NOT `tests/jest.setup.ts` — that one bounds the Prisma
 * connection pool, and a component test that touches Prisma has escaped its
 * project.
 */
import '@testing-library/jest-dom'
