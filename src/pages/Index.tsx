
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, CreditCard, BarChart3, Globe, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="font-display text-xl font-bold text-gray-900">ExpenseWhiz</Link>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Pricing</a>
              <Button variant="outline" className="ml-4" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button onClick={() => navigate("/auth", { state: { register: true } })}>Register</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-gray-900 mb-6">
            Simplify Your <span className="text-primary">Invoice Management</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create professional invoices, track expenses, and manage your business finances all in one place.
          </p>
          <Button
            size="lg"
            className="group relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            Let's Get Started
            <ChevronRight className={`ml-2 transition-transform duration-300 ${isHovered ? 'transform translate-x-1' : ''}`} />
          </Button>
        </motion.div>
      </div>

      {/* Features */}
      <div className="py-20 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-2xl bg-secondary hover:shadow-lg transition-shadow duration-300"
            >
              <FileText className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Invoicing</h3>
              <p className="text-gray-600">Create and send professional invoices in seconds</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl bg-secondary hover:shadow-lg transition-shadow duration-300"
            >
              <CreditCard className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Quick Payments</h3>
              <p className="text-gray-600">Accept payments from multiple gateways</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-2xl bg-secondary hover:shadow-lg transition-shadow duration-300"
            >
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">Track your business performance in real-time</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6 rounded-2xl bg-secondary hover:shadow-lg transition-shadow duration-300"
            >
              <Globe className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Global Ready</h3>
              <p className="text-gray-600">Multi-currency support for international business</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-gray-50" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">Choose the plan that works best for your business</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$9",
                features: ["5 Invoices/month", "Basic Analytics", "Email Support"],
              },
              {
                name: "Professional",
                price: "$29",
                features: ["Unlimited Invoices", "Advanced Analytics", "Priority Support", "Multi-currency"],
                featured: true,
              },
              {
                name: "Enterprise",
                price: "$99",
                features: ["Custom Features", "Dedicated Support", "API Access", "Custom Branding"],
              },
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-6 rounded-2xl ${
                  plan.featured
                    ? "bg-primary text-white scale-105 shadow-xl"
                    : "bg-white"
                }`}
              >
                <h3 className={`text-xl font-semibold mb-2 ${
                  plan.featured ? "text-white" : "text-gray-900"
                }`}>
                  {plan.name}
                </h3>
                <p className={`text-3xl font-bold mb-6 ${
                  plan.featured ? "text-white" : "text-gray-900"
                }`}>
                  {plan.price}
                  <span className="text-base font-normal">/month</span>
                </p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <ChevronRight className={`w-4 h-4 mr-2 ${
                        plan.featured ? "text-white" : "text-primary"
                      }`} />
                      <span className={plan.featured ? "text-white" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.featured
                      ? "bg-white text-primary hover:bg-gray-100"
                      : "bg-primary text-white"
                  }`}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
