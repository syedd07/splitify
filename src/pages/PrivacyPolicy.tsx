import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                <p>
                  Welcome to Splitify ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web services (the "Service").
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                <h3 className="text-lg font-medium mb-2">Personal Information</h3>
                <p>We collect the following personal information:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li><strong>Name:</strong> Your full name for account identification</li>
                  <li><strong>Email Address:</strong> For account creation, authentication, and communication</li>
                  <li><strong>Credit Card Information:</strong> Only the last 4 digits of your credit card number for identification purposes</li>
                </ul>
                
                <h3 className="text-lg font-medium mb-2 mt-4">Transaction Data</h3>
                <p>
                  All transaction records are entered by users themselves. Splitify does not automatically collect or process any financial transaction data from banks or financial institutions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                <p>We use the collected information for:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Providing and maintaining our Service</li>
                  <li>Creating and managing your account</li>
                  <li>Enabling expense splitting functionality</li>
                  <li>Communicating with you about your account</li>
                  <li>Improving our Service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
                <p>
                  Your personal information is stored on secure servers. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p className="mt-2">
                  We do not store complete credit card numbers - only the last 4 digits for identification purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Information Sharing</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties. Your data may be shared only:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>With other users you choose to share expenses with</li>
                  <li>When required by law or to protect our rights</li>
                  <li>With your explicit consent</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
                <p>
                  We retain your personal information only as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. International Users</h2>
                <p>
                  While Splitify is primarily designed for Indian users, we welcome users from other countries. Please note that your information may be transferred to and processed in India.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p className="mt-2">
                  <strong>Email:</strong> syedyususfali6626@gmail.com<br/>
                  <strong>Developer:</strong> Syed Yousuf Ali
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;