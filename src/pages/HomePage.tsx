import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy,
  BarChart3,
  Users,
  Gift,
  Shield,
  MessageSquare,
  Brain,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  
  const features = [
    {
      icon: <Trophy className="h-6 w-6 text-amber-600" />,
      title: 'Contest Management',
      description: 'Create and manage engaging sales contests with customizable goals and rewards.'
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
      title: 'Advanced Analytics',
      description: 'Get deep insights into dealer performance and program effectiveness.'
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-600" />,
      title: 'Multi-level Management',
      description: 'Efficiently manage relationships between admins, clients, and dealers.'
    },
    {
      icon: <Gift className="h-6 w-6 text-emerald-600" />,
      title: 'Reward System',
      description: 'Automated reward distribution and redemption tracking.'
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-600" />,
      title: 'Compliance Tools',
      description: 'Ensure program compliance with built-in verification systems.'
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-rose-600" />,
      title: 'Integrated Communication',
      description: 'Direct messaging and automated notifications via WhatsApp and email.'
    }
  ];

  const testimonials = [
    {
      quote: "Revino has transformed how we manage our dealer relationships. The platform's analytics have been invaluable.",
      author: "Sarah Chen",
      role: "Channel Manager",
      company: "TechCorp Industries"
    },
    {
      quote: "The contest features have significantly boosted our dealer engagement and sales performance.",
      author: "Michael Rodriguez",
      role: "Sales Director",
      company: "Global Solutions Ltd"
    },
    {
      quote: "Implementation was smooth, and the support team has been exceptional throughout our journey.",
      author: "David Kim",
      role: "Operations Head",
      company: "Innovative Systems"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Revino</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Transform Your Dealer Network with
              <span className="text-indigo-600"> Intelligent Incentives</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revino helps you build stronger relationships with your dealers through 
              data-driven insights, engaging contests, and automated reward systems.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => navigate('/demo')}
                className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors flex items-center"
              >
                Request Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button 
                onClick={() => navigate('/learn-more')}
                className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-indigo-50 transition-colors"
              >
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to manage and 
              grow your dealer network effectively.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Features Section */}
      <div className="py-24 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl font-bold mb-6">
                  AI-Powered Insights for Smarter Decisions
                </h2>
                <p className="text-lg mb-8 text-indigo-100">
                  Our advanced AI algorithms analyze your dealer network data to provide 
                  actionable insights and predictions.
                </p>
                <ul className="space-y-4">
                  {[
                    'Predictive sales forecasting',
                    'Dealer performance optimization',
                    'Automated contest recommendations',
                    'Risk assessment and mitigation',
                    'Personalized reward suggestions'
                  ].map((item, index) => (
                    <li key={index} className="flex items-center">
                      <Brain className="h-5 w-5 mr-3" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
            <div className="lg:pl-12">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <div className="space-y-6">
                  {[
                    {
                      title: 'Performance Prediction',
                      value: '94%',
                      description: 'accuracy in sales forecasting'
                    },
                    {
                      title: 'Engagement Boost',
                      value: '47%',
                      description: 'increase in dealer participation'
                    },
                    {
                      title: 'Time Saved',
                      value: '12hrs',
                      description: 'per week in management tasks'
                    }
                  ].map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-indigo-200">
                          {stat.title}
                        </h4>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <p className="text-sm text-indigo-200">{stat.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Trusted by Industry Leaders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 p-8 rounded-xl"
              >
                <p className="text-gray-600 mb-6">"{testimonial.quote}"</p>
                <div>
                  <p className="font-medium text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="text-center lg:text-left mb-8 lg:mb-0">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to transform your dealer network?
              </h2>
              <p className="text-indigo-100">
                Get started with Revino today and see the difference.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/demo')}
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-50 transition-colors"
              >
                Schedule Demo
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="bg-indigo-500 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-400 transition-colors flex items-center justify-center"
              >
                Contact Sales
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Trophy className="h-8 w-8 text-indigo-400" />
                <span className="ml-2 text-xl font-bold text-white">Revino</span>
              </div>
              <p className="text-sm">
                Transforming dealer networks through intelligent incentive management.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Solutions</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Updates</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
            <p>© 2025 Revino. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;