import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Splitify ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                <p>
                  Splitify is a free expense-sharing application that helps users split credit card expenses with friends, family, and roommates. The Service allows users to:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Add credit cards (storing only last 4 digits)</li>
                  <li>Record and categorize expenses</li>
                  <li>Split expenses among multiple users</li>
                  <li>Generate expense reports and statements</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
                <p>Users are responsible for:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Providing accurate information when using the Service</li>
                  <li>Manually entering all transaction data</li>
                  <li>Verifying the accuracy of all expense records</li>
                  <li>Maintaining the confidentiality of their account credentials</li>
                  <li>Using the Service only for legitimate expense-sharing purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Financial Disclaimer</h2>
                <p>
                  <strong>Important:</strong> Splitify does not process, handle, or facilitate actual financial transactions. All transaction records are manually entered by users. We are not responsible for:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>The accuracy of user-entered transaction data</li>
                  <li>Actual money transfers between users</li>
                  <li>Financial disputes between users</li>
                  <li>Integration with banks or financial institutions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Age Requirements</h2>
                <p>
                  While there is no strict age restriction, Splitify is designed for credit card holders who are typically 21 years or older. Users under 18 should obtain parental consent before using the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Privacy and Data Protection</h2>
                <p>
                  We collect only essential information (name, email, last 4 digits of credit cards) as detailed in our Privacy Policy. We do not store complete credit card numbers or process financial transactions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Prohibited Uses</h2>
                <p>You may not use the Service to:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Share false or misleading information</li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>Use the Service for commercial purposes without permission</li>
                  <li>Interfere with the Service's functionality</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
                <p>
                  Splitify is provided "as is" and is completely free to use. While primarily designed for Indian users, the Service is available internationally. We do not guarantee uninterrupted availability of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
                <p>
                  Splitify and its developer shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or use, incurred by you or any third party.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
                <p>
                  We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
                <p>
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. Contact Information</h2>
                <p>
                  For questions about these Terms of Service, please contact:
                </p>
                <p className="mt-2">
                  <strong>Email:</strong> syedyususfali6626@gmail.com<br/>
                  <strong>Developer:</strong> Syed Yousuf Ali<br/>
                  <strong>GitHub:</strong> github.com/syedd07
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
                <p>
                  These Terms shall be interpreted and governed by the laws of India. Any disputes arising from these terms shall be subject to the jurisdiction of Indian courts.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;