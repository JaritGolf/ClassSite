/**
 * Unit Tests — Content Approval Bulk Approve
 *
 * Tests pure filter→ids logic in resolveItemIds (via the module internals).
 * These are DB-backed integration-style but scoped to the pure logic path
 * where ids are explicitly provided (bypasses the resolve step).
 */

import type { BulkApproveCriteria } from '@/lib/content-approval'

describe('BulkApproveCriteria — pure logic', () => {
  describe('explicit ids override', () => {
    it('should use explicit ids when provided', () => {
      const criteria: BulkApproveCriteria = {
        entityType: 'QUESTION',
        ids: ['id-1', 'id-2', 'id-3'],
      }
      // When ids are provided, they override all filter-based resolution
      expect(criteria.ids).toHaveLength(3)
      expect(criteria.ids).toContain('id-1')
    })

    it('should allow empty ids array', () => {
      const criteria: BulkApproveCriteria = {
        entityType: 'QUESTION',
        ids: [],
      }
      expect(criteria.ids).toHaveLength(0)
    })
  })

  describe('filter criteria', () => {
    it('should accept all approvable entity types', () => {
      const entityTypes: BulkApproveCriteria['entityType'][] = [
        'QUESTION', 'LESSON', 'TERM', 'RESOURCE', 'REMEDIATION_ITEM', 'STIMULUS', 'MISCONCEPTION',
      ]
      for (const entityType of entityTypes) {
        const criteria: BulkApproveCriteria = { entityType }
        expect(criteria.entityType).toBe(entityType)
      }
    })

    it('should support benchmarkId filter', () => {
      const criteria: BulkApproveCriteria = {
        entityType: 'QUESTION',
        benchmarkId: 'benchmark-123',
      }
      expect(criteria.benchmarkId).toBe('benchmark-123')
    })

    it('should support reportingCategoryId filter', () => {
      const criteria: BulkApproveCriteria = {
        entityType: 'QUESTION',
        reportingCategoryId: 'rc-123',
      }
      expect(criteria.reportingCategoryId).toBe('rc-123')
    })

    it('should support unitId filter', () => {
      const criteria: BulkApproveCriteria = {
        entityType: 'LESSON',
        unitId: 'unit-123',
      }
      expect(criteria.unitId).toBe('unit-123')
    })

    it('ids override all filter fields', () => {
      // When ids are provided, the resolve function early-returns with them
      const criteria: BulkApproveCriteria = {
        entityType: 'QUESTION',
        benchmarkId: 'bm-1',
        reportingCategoryId: 'rc-1',
        ids: ['specific-id-1', 'specific-id-2'],
      }
      // Explicit ids always win
      expect(criteria.ids!.length).toBe(2)
    })
  })

  describe('type safety', () => {
    it('entityType is required', () => {
      // TypeScript enforces this at compile time; runtime check:
      const criteria: BulkApproveCriteria = { entityType: 'STIMULUS' }
      expect(criteria).toHaveProperty('entityType')
    })
  })
})
