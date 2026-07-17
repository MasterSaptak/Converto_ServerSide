/**
 * Mock Payment Engine
 * Simulates the Stripe API interface to allow for end-to-end testing of the platform
 * without requiring real API keys or webhooks during MVP development.
 */

export const MockPaymentEngine = {
  /**
   * Simulates generating a Stripe Payment Intent Client Secret
   */
  async createPaymentIntent(orderId: string, amount: number, currency: string) {
    // In a real app, this would call stripe.paymentIntents.create
    // We generate a fake client secret that the frontend will use
    const fakeIntentId = `pi_mock_${Math.random().toString(36).substring(2, 15)}`
    const fakeClientSecret = `${fakeIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`
    
    return {
      id: fakeIntentId,
      client_secret: fakeClientSecret,
      amount,
      currency,
    }
  },

  /**
   * Simulates verifying a webhook signature (always returns true for mock)
   */
  verifyWebhookSignature(payload: string, signature: string) {
    return true; // Fake verification
  }
}
