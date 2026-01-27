'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MapPin, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Ruler
} from 'lucide-react';
import { toast } from 'sonner';

const features = [
  {
    icon: MapPin,
    title: 'Door Knocking Map',
    description: 'Interactive map for canvassing neighborhoods. Track visits, set appointments, and convert leads directly from the map.',
  },
  {
    icon: Ruler,
    title: 'QuickSquares™ Auto-Measure',
    description: 'Instantly calculate roof measurements from satellite imagery. Get accurate square footage in seconds - no ladder required.',
    highlight: true,
  },
  {
    icon: Users,
    title: 'Lead Management',
    description: 'Capture and organize leads from multiple sources. Track progress through your sales pipeline with ease.',
  },
  {
    icon: FileText,
    title: 'Smart Quoting',
    description: 'Generate professional quotes in minutes. Auto-calculate materials, labor, and margins. Digital signatures included.',
  },
  {
    icon: Calendar,
    title: 'Project Scheduling',
    description: 'Coordinate crews, manage timelines, and keep projects on track. Real-time updates for your entire team.',
  },
  {
    icon: DollarSign,
    title: 'Invoicing & Payments',
    description: 'Create invoices, track payments, and manage change orders. Get paid faster with integrated billing.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Track sales performance, revenue forecasts, and team productivity. Make data-driven decisions.',
  },
];

const benefits = [
  'Measure roofs instantly with QuickSquares™ satellite technology',
  'Save 10+ hours per week on administrative tasks',
  'Close 30% more deals with faster quote turnaround',
  'Reduce errors with automated calculations',
  'Access your CRM anywhere - mobile and desktop',
  'Multi-location support for growing businesses',
  'Dedicated support team to help you succeed',
];

export function LandingPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Send to your email or CRM system
      // For now, just show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Demo request submitted! We\'ll contact you within 24 hours.');
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        message: '',
      });
    } catch (error) {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Ketterly</h1>
              <span className="ml-3 text-sm text-gray-500">CRM for Roofing Companies</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="#features">
                <Button variant="ghost">Features</Button>
              </Link>
              <Link href="#demo">
                <Button variant="ghost">Request Demo</Button>
              </Link>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              The CRM Built for<br />Roofing Companies
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              From door knocking to final payment, manage your entire roofing business 
              in one powerful platform. Close more deals, streamline operations, and grow faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#demo">
                <Button size="lg" className="text-lg px-8">
                  Request a Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Roofing Business
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for roofing contractors
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow ${
                  feature.highlight 
                    ? 'border-blue-500 ring-2 ring-blue-200 relative' 
                    : 'border-gray-200'
                }`}
              >
                {feature.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    NEW
                  </div>
                )}
                <feature.icon className={`w-12 h-12 mb-4 ${
                  feature.highlight ? 'text-blue-600' : 'text-blue-600'
                }`} />
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-4xl font-bold text-gray-900 mb-6">
                Why Roofing Companies Choose Ketterly
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Join hundreds of roofing contractors who have transformed their 
                businesses with our all-in-one CRM platform.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-8">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">10+</div>
                  <div className="text-gray-600">Hours Saved Per Week</div>
                </div>
                <div className="border-t pt-4 text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">30%</div>
                  <div className="text-gray-600">More Deals Closed</div>
                </div>
                <div className="border-t pt-4 text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">100%</div>
                  <div className="text-gray-600">Cloud-Based</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Form Section */}
      <section id="demo" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              See Ketterly in Action
            </h3>
            <p className="text-xl text-gray-600">
              Schedule a personalized demo and discover how Ketterly can transform your roofing business
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <Input
                  id="company"
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="ABC Roofing"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@abcroofing.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Tell us about your business (optional)
              </label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Number of employees, current pain points, what you're looking for..."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Request Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>

            <p className="text-sm text-gray-500 text-center mt-4">
              We'll get back to you within 24 hours to schedule your personalized demo
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-xl font-bold mb-4">Ketterly</h4>
              <p className="text-gray-400">
                The complete CRM solution built specifically for roofing contractors.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#demo" className="hover:text-white">Request Demo</Link></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Contact</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@ketterly.com</li>
                <li>Phone: (555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Ketterly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
