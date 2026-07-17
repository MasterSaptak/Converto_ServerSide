// =====================================================
// CONVERTO PLATFORM — Exchange Module Entry Point
// =====================================================
// This module contains ONLY business rules specific to
// Currency Exchange. It delegates all storage, state,
// and workflow management to the Core Engine.
// =====================================================

export const metadata = {
  name: 'Currency Exchange',
  slug: 'exchange',
  requires_documents: false,
  requires_payment: true,
};
