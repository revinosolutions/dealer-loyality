import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, BarChart3, Award, Users, ArrowRight, CheckCircle, 
  Star, ChevronDown, ChevronUp, Mail, Globe, Phone, Shield,
  PieChart, LineChart, TrendingUp, Calendar, Clock,
  Settings, Bell, Zap, Briefcase, Target, Gift, Coffee, Play, ChevronRight, Heart, Sparkles, BadgeCheck, DollarSign
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manufacturers');
  const [activeAccordion, setActiveAccordion] = useState('faq-1');
  const [isVisible, setIsVisible] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const featuresRef = useRef<HTMLDivElement>(null);
  
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Channel Sales Director",
      company: "TechGlobal Inc.",
      image: "/api/placeholder/80/80",
      content: "Revino has transformed how we manage our dealer incentive programs. We've seen a 37% increase in dealer engagement and 22% boost in sales performance."
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "VP of Partner Relations",
      company: "Quantum Motors",
      image: "/api/placeholder/80/80",
      content: "The analytics and reporting features have given us unprecedented insights into our dealer network. Implementation was smooth and ROI was evident within the first quarter."
    },
    {
      id: 3,
      name: "Alexandra Rivera",
      role: "Chief Revenue Officer",
      company: "Precision Equipment",
      image: "/api/placeholder/80/80",
      content: "With Revino, we've reduced administration time by 65% while increasing the effectiveness of our incentive programs. Their customer service is exceptional."
    }
  ];
  
  const stats = [
    { id: 1, value: '87%', label: 'Increase in Dealer Engagement' },
    { id: 2, value: '42%', label: 'Boost in Sales Performance' },
    { id: 3, value: '65%', label: 'Reduction in Administrative Time' },
    { id: 4, value: '3.5x', label: 'Return on Investment' }
  ];
  
  const faqs = [
    { 
      id: 'faq-1', 
      question: 'How quickly can we implement Revino?', 
      answer: 'Most clients are fully operational within 2-4 weeks, depending on the complexity of your existing systems and data. Our dedicated implementation team will guide you through every step of the process.' 
    },
    { 
      id: 'faq-2', 
      question: 'Can Revino integrate with our existing CRM?', 
      answer: 'Yes, Revino offers seamless integration with major CRM platforms including Salesforce, HubSpot, Microsoft Dynamics, and more. We also provide custom API solutions for proprietary systems.' 
    },
    { 
      id: 'faq-3', 
      question: 'How does the pricing structure work?', 
      answer: 'Our pricing is based on the number of dealers in your network and the features you need. We offer tiered packages starting from small businesses to enterprise solutions. Contact our sales team for a customized quote.' 
    },
    { 
      id: 'faq-4', 
      question: 'What support options are available?', 
      answer: 'All clients receive 24/7 technical support, a dedicated account manager, and access to our extensive knowledge base. Premium support packages with implementation consultancy are also available.' 
    },
  ];
  
  // Animation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
      
      if (position > 100) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };
  

  const toggleAccordion = (id: string): void => {
    setActiveAccordion(activeAccordion === id ? '' : id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`bg-white shadow-sm py-4 px-6 sticky top-0 z-50 transition-all duration-300 ${scrollPosition > 50 ? 'py-3 shadow-md' : 'py-4'} text-gray-900`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-2 rounded-lg mr-2 transform transition-transform hover:scale-110">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">Revino</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Features</a>
            <a href="#solutions" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Solutions</a>
            <a href="#testimonials" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Testimonials</a>
            <a href="#pricing" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Pricing</a>
            <button
              onClick={() => user ? navigate('/dashboard') : navigate('/login')}
              className="btn-primary"
            >
              {user ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
          
          {/* User Notification Banner - visible only for logged-in users */}
          {user && (
            <div className="fixed top-20 right-6 bg-gradient-to-r from-primary-500 to-secondary-600 text-white p-4 rounded-lg shadow-lg max-w-md z-50 animate-fade-in-down">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="font-medium">Welcome back, {user.name}!</p>
                  <p className="text-sm mt-1">You're already logged in.</p>
                </div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="ml-4 px-3 py-1 bg-white text-primary-600 text-sm font-medium rounded hover:bg-opacity-90 transition-colors"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}
          
          {/* Mobile Navigation Toggle */}
          <button 
            className="md:hidden text-gray-600 hover:text-primary-600 focus:outline-none"
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            {isNavOpen ? 
              <ChevronUp className="h-6 w-6" /> : 
              <ChevronDown className="h-6 w-6" />
            }
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isNavOpen && (
          <div className="md:hidden mt-4 pb-4 px-4 bg-white rounded-lg shadow-lg">
            <div className="flex flex-col space-y-3">
              <a href="#features" className="text-gray-600 hover:text-primary-600 font-medium transition-colors py-2">Features</a>
              <a href="#solutions" className="text-gray-600 hover:text-primary-600 font-medium transition-colors py-2">Solutions</a>
              <a href="#testimonials" className="text-gray-600 hover:text-primary-600 font-medium transition-colors py-2">Testimonials</a>
              <a href="#pricing" className="text-gray-600 hover:text-primary-600 font-medium transition-colors py-2">Pricing</a>
              <button
                onClick={() => user ? navigate('/dashboard') : navigate('/login')}
                className="text-left text-primary-600 font-medium hover:text-primary-700 transition-colors py-2"
              >
                {user ? 'Dashboard' : 'Log In'}
              </button>
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-primary-500 to-secondary-600 text-white rounded-md font-medium py-2 hover:from-primary-600 hover:to-secondary-700 transition-colors"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-secondary-800 text-white py-24 px-6 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-[40%] right-[10%] w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[10%] left-[30%] w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-block bg-primary-500 bg-opacity-20 px-4 py-1 rounded-full mb-4">
              <p className="text-sm font-medium flex items-center">
                <Sparkles className="h-4 w-4 mr-2" /> Next-Gen Dealer Management
              </p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Revolutionize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-300 to-primary-300">Dealer Incentive</span> Programs
            </h1>
            <p className="text-xl text-primary-100 mb-8 leading-relaxed">
              Boost sales performance, enhance dealer loyalty, and optimize your channel 
              partnerships with our comprehensive loyalty platform tailored for modern businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-primary-500 to-secondary-600 text-white px-8 py-4 rounded-xl font-medium text-lg flex items-center justify-center hover:from-primary-600 hover:to-secondary-700 transition-all duration-300 shadow-lg transform hover:scale-105 hover:shadow-xl"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/demo')}
                className="bg-transparent backdrop-blur-sm bg-white bg-opacity-10 border border-white border-opacity-20 text-white px-8 py-4 rounded-xl font-medium text-lg flex items-center justify-center hover:bg-opacity-20 transition-all duration-300 group"
              >
                <Play className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                Watch Demo
              </button>
            </div>
            
            <div className="mt-10 flex items-center">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img 
                    key={i}
                    src={`/api/placeholder/40/40`} 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-indigo-700"
                  />
                ))}
              </div>
              <div className="ml-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm mt-1">Trusted by 500+ companies worldwide</p>
              </div>
            </div>
          </div>
          
          <div className={`hidden md:block transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-10 -left-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full w-64 h-64 opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -right-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full w-64 h-64 opacity-20 animate-pulse delay-700"></div>
              
              {/* Main image with glass morphism effect */}
              <div className="backdrop-blur-sm bg-white bg-opacity-10 p-6 rounded-2xl border border-white border-opacity-20 shadow-2xl relative z-10">
                <img 
                  src="/api/placeholder/600/400" 
                  alt="Revino Platform" 
                  className="rounded-lg shadow-inner relative z-10"
                />
              </div>
              
              {/* Floating UI Elements with glass morphism */}
              <div className="absolute top-6 -right-12 backdrop-blur-sm bg-white bg-opacity-80 p-4 rounded-xl shadow-lg flex items-center animate-float">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">SALES GROWTH</p>
                  <p className="text-lg font-bold text-green-600">+24%</p>
                </div>
              </div>
              
              <div className="absolute -bottom-8 left-12 backdrop-blur-sm bg-white bg-opacity-80 p-4 rounded-xl shadow-lg flex items-center animate-float animation-delay-1000">
                <div className="bg-indigo-100 p-2 rounded-full mr-3">
                  <Award className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">ACHIEVEMENT</p>
                  <p className="text-lg font-bold text-indigo-600">Top Performer</p>
                </div>
              </div>
              
              {/* Additional floating element */}
              <div className="absolute top-1/2 -left-16 transform -translate-y-1/2 backdrop-blur-sm bg-white bg-opacity-80 p-4 rounded-xl shadow-lg flex items-center animate-float animation-delay-2000">
                <div className="bg-purple-100 p-2 rounded-full mr-3">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">DEALER NETWORK</p>
                  <p className="text-lg font-bold text-purple-600">500+ Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Brands Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block bg-primary-100 px-4 py-1 rounded-full mb-4">
            <p className="text-sm font-medium text-primary-700 flex items-center justify-center">
              <BadgeCheck className="h-4 w-4 mr-2" /> TRUSTED BY INDUSTRY LEADERS
            </p>
          </div>
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Trusted by Leading Manufacturers Worldwide</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center mt-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex justify-center group">
                <div className="p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
                  <img 
                    src={`/api/placeholder/150/50`} 
                    alt={`Partner ${i}`} 
                    className="h-8 object-contain opacity-60 group-hover:opacity-100 transition-all duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-primary-100 px-4 py-1 rounded-full mb-4">
              <p className="text-sm font-medium text-primary-700 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 mr-2" /> PROVEN RESULTS
              </p>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Real Impact for Your Business</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our clients consistently report significant improvements in key performance metrics after implementing Revino.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.id} className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-gray-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4 mx-auto">
                  {stat.id === 1 && <Users className="h-8 w-8 text-primary-600" />}
                  {stat.id === 2 && <TrendingUp className="h-8 w-8 text-primary-600" />}
                  {stat.id === 3 && <Clock className="h-8 w-8 text-primary-600" />}
                  {stat.id === 4 && <BarChart3 className="h-8 w-8 text-primary-600" />}
                </div>
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 mb-2">{stat.value}</p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section id="case-studies" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-primary-100 px-4 py-1 rounded-full mb-4">
              <p className="text-sm font-medium text-primary-700 flex items-center justify-center">
                <Briefcase className="h-4 w-4 mr-2" /> SUCCESS STORIES
              </p>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              How Leading Companies Transformed Their Dealer Networks
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover how our clients achieved remarkable results with Revino's dealer incentive platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Case Study 1 */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="h-48 bg-gradient-to-r from-primary-500 to-secondary-600 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/api/placeholder/400/200" alt="Case Study" className="object-cover w-full h-full opacity-50" />
                  <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
                    <p className="text-xs font-medium text-primary-700">Manufacturing</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">TechGlobal's Dealer Transformation</h3>
                <p className="text-gray-600 mb-4">How a leading technology manufacturer increased dealer engagement by 37% and boosted sales by 22% in just 6 months.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Read time: 5 min</span>
                  <button className="text-primary-600 hover:text-primary-800 font-medium flex items-center">
                    Read Case Study <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Case Study 2 */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="h-48 bg-gradient-to-r from-secondary-500 to-primary-600 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/api/placeholder/400/200" alt="Case Study" className="object-cover w-full h-full opacity-50" />
                  <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
                    <p className="text-xs font-medium text-secondary-700">Automotive</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">Quantum Motors' Sales Revolution</h3>
                <p className="text-gray-600 mb-4">How a premium automotive brand streamlined their incentive programs and achieved a 42% increase in dealer performance.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Read time: 7 min</span>
                  <button className="text-primary-600 hover:text-primary-800 font-medium flex items-center">
                    Read Case Study <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Case Study 3 */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="h-48 bg-gradient-to-r from-primary-400 to-secondary-500 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/api/placeholder/400/200" alt="Case Study" className="object-cover w-full h-full opacity-50" />
                  <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
                    <p className="text-xs font-medium text-primary-700">Equipment</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">Precision Equipment's Efficiency Gains</h3>
                <p className="text-gray-600 mb-4">How a global equipment manufacturer reduced administrative time by 65% while improving incentive program effectiveness.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Read time: 6 min</span>
                  <button className="text-primary-600 hover:text-primary-800 font-medium flex items-center">
                    Read Case Study <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Powerful Features for Modern Businesses
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides everything you need to create, manage, and optimize your dealer incentive programs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" ref={featuresRef}>
            <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="bg-gradient-to-br from-primary-500 to-secondary-600 p-4 rounded-2xl inline-block mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-primary-600 transition-colors duration-300 text-gray-900">Advanced Analytics</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Real-time insights into dealer performance with comprehensive analytics dashboards and customizable reports.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Performance tracking</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Custom reports</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Trend analysis</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="bg-gradient-to-br from-secondary-500 to-primary-500 p-4 rounded-2xl inline-block mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-secondary-600 transition-colors duration-300 text-gray-900">Reward Management</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Streamlined incentive and reward distribution to motivate your sales channels with automated processes.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Multiple reward types</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Automated distribution</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Tiered reward structures</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="bg-gradient-to-br from-primary-400 to-secondary-500 p-4 rounded-2xl inline-block mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-primary-600 transition-colors duration-300 text-gray-900">Contest Creation</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Easily launch and manage sales competitions with customizable templates and real-time leaderboards.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Campaign templates</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Live leaderboards</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Goal tracking</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="bg-gradient-to-br from-primary-500 to-secondary-600 p-4 rounded-2xl inline-block mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-primary-600 transition-colors duration-300 text-gray-900">Dealer Management</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Comprehensive tools to manage your dealer network and optimize relationships with detailed profiles.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Dealer profiles</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Communication tools</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Performance history</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="bg-gradient-to-br from-primary-500 to-secondary-600 p-4 rounded-2xl inline-block mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-primary-600 transition-colors duration-300 text-gray-900">Smart Notifications</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Keep everyone engaged with automated alerts, milestone notifications, and personalized updates.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Multi-channel alerts</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Scheduled notifications</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Custom messaging</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
              <div className="bg-gradient-to-br from-primary-500 to-secondary-600 p-4 rounded-2xl inline-block mb-6 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-primary-600 transition-colors duration-300 text-gray-900">Integration Hub</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Connect seamlessly with your existing tools through our extensive API and pre-built integrations.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>CRM integration</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>ERP connectivity</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="bg-green-100 p-1 rounded-full mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>API access</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <a 
              href="#" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-secondary-700 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105"
            >
              View all features
              <ArrowRight className="ml-2 h-5 w-5 animate-pulse" />
            </a>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Tailored Solutions for Your Industry
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how Revino can be customized to meet the specific needs of your business sector.
            </p>
          </div>
          
          {/* Solutions Tabs */}
          <div className="mb-12">
            <div className="flex flex-wrap justify-center border-b border-gray-200 mb-8">
              {['manufacturers', 'distributors', 'retail', 'technology'].map((tab) => (
                <button
                  key={tab}
                  className={`px-6 py-3 font-medium text-lg capitalize ${
                    activeTab === tab 
                      ? 'text-primary-600 border-b-2 border-primary-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4 capitalize">
                  {activeTab === 'manufacturers' && 'Manufacturing Excellence'}
                  {activeTab === 'distributors' && 'Distribution Network Optimization'}
                  {activeTab === 'retail' && 'Retail Performance Boost'}
                  {activeTab === 'technology' && 'Technology Channel Management'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'manufacturers' && 'Optimize your dealer network with tailored incentive programs that drive sales of specific product lines, improve product knowledge, and increase market share.'}
                  {activeTab === 'distributors' && 'Strengthen relationships with your reseller network through targeted incentives that reward volume, product mix, and customer acquisition.'}
                  {activeTab === 'retail' && 'Motivate your retail partners with customized reward programs that drive foot traffic, increase average transaction value, and improve customer satisfaction.'}
                  {activeTab === 'technology' && 'Empower your technology partners with specialized incentive structures that accelerate adoption, encourage certification, and reward solution development.'}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {activeTab === 'manufacturers' && (
                    <>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Product-specific sales incentives with tiered rewards</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Training completion and certification rewards</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Market development fund management</span>
                      </li>
                    </>
                  )}
                  
                  {activeTab === 'distributors' && (
                    <>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Volume-based incentives with automatic tier progression</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>New market penetration rewards</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Supply chain optimization incentives</span>
                      </li>
                    </>
                  )}
                  
                  {activeTab === 'retail' && (
                    <>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Seasonal promotion management</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Customer satisfaction-linked rewards</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Visual merchandising compliance incentives</span>
                      </li>
                    </>
                  )}
                  
                  {activeTab === 'technology' && (
                    <>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Certification and specialization rewards</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Solution development incentives</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <span>Recurring revenue growth programs</span>
                      </li>
                    </>
                  )}
                </ul>
                
                <button
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-600 text-white rounded-md font-medium hover:from-primary-600 hover:to-secondary-700 transition-colors inline-flex items-center"
                  onClick={() => navigate(`/solutions/${activeTab}`)}
                >
                  Learn More
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute -z-10 w-3/4 h-3/4 bg-primary-100 rounded-full opacity-50 blur-2xl right-0 top-10"></div>
                <img 
                  src="/api/placeholder/600/400" 
                  alt={`${activeTab} Solution`} 
                  className="rounded-lg shadow-lg border border-gray-100 w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover how Revino has transformed dealer incentive programs for leading companies across industries.
            </p>
          </div>
          
          <div className="relative">
            <div className="flex overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)`, width: `${testimonials.length * 100}%` }}
              >
                {testimonials.map((testimonial) => (
                  <div 
                    key={testimonial.id} 
                    className="w-full px-4"
                    style={{ flex: `0 0 ${100 / testimonials.length}%` }}
                  >
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-center mb-6">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" />
                          ))}
                        </div>
                        <p className="text-gray-700 mb-8 italic leading-relaxed">
                          "{testimonial.content}"
                        </p>
                        <div className="flex items-center">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name} 
                            className="h-12 w-12 rounded-full mr-4"
                          />
                          <div>
                            <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                            <p className="text-gray-500 text-sm">{testimonial.role}, {testimonial.company}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <a 
              href="/case-studies" 
              className="inline-flex items-center text-primary-600 font-medium hover:text-primary-800 transition-colors"
            >
              View all case studies
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              How Revino Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A simple, four-step process to transform your dealer incentive programs
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center relative">
              <div className="bg-primary-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-primary-100 -z-0"></div>
              <h3 className="text-xl font-bold mb-3">Configure</h3>
              <p className="text-gray-600">
                Set up your customized incentive structure based on your specific business objectives.
              </p>
            </div>
            
            <div className="text-center relative">
              <div className="bg-primary-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-primary-100 -z-0"></div>
              <h3 className="text-xl font-bold mb-3">Deploy</h3>
              <p className="text-gray-600">
                Launch your program to your dealer network with our intuitive onboarding process.
              </p>
            </div>
            
            <div className="text-center relative">
              <div className="bg-primary-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-primary-100 -z-0"></div>
              <h3 className="text-xl font-bold mb-3">Monitor</h3>
              <p className="text-gray-600">
                Track performance metrics and engagement in real-time through comprehensive dashboards.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary-600">4</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Optimize</h3>
              <p className="text-gray-600">
                Refine your program based on data-driven insights to continuously improve results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that works best for your business needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-gray-600 mb-6">Perfect for small businesses</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Up to 50 dealers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Standard templates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Email support</span>
                </li>
              </ul>
              <button
                className="w-full px-6 py-3 bg-gray-800 text-white rounded-md font-medium hover:bg-gray-900 transition-colors"
                onClick={() => navigate('/signup?plan=starter')}
              >
                Get Started
              </button>
            </div>
            
            {/* Professional Plan */}
            <div className="border-2 border-primary-600 rounded-xl p-8 shadow-xl relative">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-primary-600 text-white text-sm font-bold py-1 px-3 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2">Professional</h3>
              <p className="text-gray-600 mb-6">Ideal for growing companies</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$999</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Up to 200 dealers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Custom templates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>API access</span>
                </li>
              </ul>
              <button
                className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-600 text-white rounded-md font-medium hover:from-primary-600 hover:to-secondary-700 transition-colors"
                onClick={() => navigate('/signup?plan=professional')}
              >
                Get Started
              </button>
            </div>
            
            {/* Enterprise Plan */}
            <div className="border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For large organizations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Unlimited dealers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Custom analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>White-labeling</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <span>Custom integrations</span>
                </li>
              </ul>
              <button
                className="w-full px-6 py-3 bg-gray-800 text-white rounded-md font-medium hover:bg-gray-900 transition-colors"
                onClick={() => navigate('/contact-sales')}
              >
                Contact Sales
              </button>
            </div>
          </div>
          
          <div className="mt-12 bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Need a custom solution?</h3>
                <p className="text-gray-600">
                  We offer tailored plans for businesses with specific requirements.
                </p>
              </div>
              <button
                className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-600 text-white rounded-md font-medium hover:from-primary-600 hover:to-secondary-700 transition-colors"
                onClick={() => navigate('/contact-sales')}
              >
                Contact Our Sales Team
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-700 via-purple-700 to-purple-900 text-white relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-[40%] right-[10%] w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[10%] left-[30%] w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block bg-white bg-opacity-10 backdrop-blur-sm px-4 py-1 rounded-full mb-6">
            <p className="text-sm font-medium flex items-center justify-center">
              <Zap className="h-4 w-4 mr-2" /> LIMITED TIME OFFER
            </p>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Dealer Incentive Programs?</h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join hundreds of leading manufacturers who have revolutionized their dealer relationships with Revino. Sign up today and get a free 30-day trial with full access to all features.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-white text-indigo-700 px-8 py-4 rounded-xl font-medium text-lg hover:bg-indigo-50 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="bg-transparent backdrop-blur-sm bg-white bg-opacity-10 border border-white border-opacity-20 px-8 py-4 rounded-xl font-medium text-lg hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center"
            >
              Schedule Demo
            </button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-xl border border-white border-opacity-20">
              <div className="bg-indigo-500 bg-opacity-30 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Risk-Free Trial</h3>
              <p className="text-indigo-100">No credit card required. Full access to all features for 30 days.</p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-xl border border-white border-opacity-20">
              <div className="bg-indigo-500 bg-opacity-30 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quick Setup</h3>
              <p className="text-indigo-100">Be up and running in less than a day with our guided onboarding process.</p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-xl border border-white border-opacity-20">
              <div className="bg-indigo-500 bg-opacity-30 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Dedicated Support</h3>
              <p className="text-indigo-100">Our customer success team will guide you every step of the way.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-indigo-100 px-4 py-1 rounded-full mb-4">
              <p className="text-sm font-medium text-indigo-700 flex items-center justify-center">
                <Mail className="h-4 w-4 mr-2" /> GET IN TOUCH
              </p>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Have Questions? We're Here to Help
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our team of experts is ready to answer your questions and help you find the perfect solution for your business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      id="name" 
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      id="email" 
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input 
                    type="text" 
                    id="company" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Acme Inc."
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea 
                    id="message" 
                    rows={4} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Tell us about your dealer network and what you're looking for..."
                  ></textarea>
                </div>
                
                <button
                  type="button"
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors font-medium"
                >
                  Send Message
                </button>
              </form>
            </div>
            
            <div>
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="bg-indigo-100 p-3 rounded-full mr-4">
                    <Mail className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">Email Us</h3>
                    <p className="text-gray-600 mb-2">Our friendly team is here to help.</p>
                    <a href="mailto:hello@revino.com" className="text-indigo-600 hover:text-indigo-800 font-medium">hello@revino.com</a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-indigo-100 p-3 rounded-full mr-4">
                    <Phone className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">Call Us</h3>
                    <p className="text-gray-600 mb-2">Mon-Fri from 8am to 5pm.</p>
                    <a href="tel:+1-555-123-4567" className="text-indigo-600 hover:text-indigo-800 font-medium">+1 (555) 123-4567</a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-indigo-100 p-3 rounded-full mr-4">
                    <Globe className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">Visit Us</h3>
                    <p className="text-gray-600 mb-2">Come say hello at our headquarters.</p>
                    <p className="text-gray-800">100 Technology Drive, Suite 300<br />San Francisco, CA 94105</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-indigo-100 px-4 py-1 rounded-full mb-4">
              <p className="text-sm font-medium text-indigo-700 flex items-center justify-center">
                <DollarSign className="h-4 w-4 mr-2" /> PRICING PLANS
              </p>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that's right for your business. All plans include a 30-day free trial.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-bold mb-2 text-gray-900">Starter</h3>
                <p className="text-gray-600 mb-6">Perfect for small businesses just getting started</p>
                <div className="flex items-end mb-6">
                  <span className="text-4xl font-bold text-gray-900">$499</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <button
                  onClick={handleGetStarted}
                  className="w-full py-3 px-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Get Started
                </button>
              </div>
              <div className="p-8">
                <p className="font-medium mb-4 text-gray-900">Includes:</p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Up to 25 dealers</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Basic analytics</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Standard incentive programs</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Email support</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Professional Plan */}
            <div className="bg-white rounded-2xl border-2 border-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 rounded-bl-lg text-sm font-medium">
                Most Popular
              </div>
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-bold mb-2 text-gray-900">Professional</h3>
                <p className="text-gray-600 mb-6">Ideal for established businesses with active dealer networks</p>
                <div className="flex items-end mb-6">
                  <span className="text-4xl font-bold text-gray-900">$999</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <button
                  onClick={handleGetStarted}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  Get Started
                </button>
              </div>
              <div className="p-8">
                <p className="font-medium mb-4 text-gray-900">Everything in Starter, plus:</p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Up to 100 dealers</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Advanced analytics & reporting</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Custom incentive programs</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Priority email & phone support</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>CRM integration</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-xl font-bold mb-2 text-gray-900">Enterprise</h3>
                <p className="text-gray-600 mb-6">For large organizations with complex dealer networks</p>
                <div className="flex items-end mb-6">
                  <span className="text-4xl font-bold text-gray-900">Custom</span>
                </div>
                <button
                  onClick={() => navigate('/contact')}
                  className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors"
                >
                  Contact Sales
                </button>
              </div>
              <div className="p-8">
                <p className="font-medium mb-4 text-gray-900">Everything in Professional, plus:</p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Unlimited dealers</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Enterprise-grade security</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Dedicated account manager</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>Custom API development</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span>White-labeling options</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about Revino
            </p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div 
                key={faq.id} 
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex justify-between items-center p-6 text-left bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => toggleAccordion(faq.id)}
                >
                  <span className="font-medium text-lg">{faq.question}</span>
                  {activeAccordion === faq.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {activeAccordion === faq.id && (
                  <div className="p-6 pt-0 bg-white">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <a 
              href="/contact" 
              className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
            >
              Contact our support team
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Dealer Incentive Programs?
          </h2>
          <p className="text-xl text-indigo-200 mb-8 max-w-3xl mx-auto">
            Join hundreds of leading companies that are already using Revino to boost their sales performance and dealer loyalty.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="bg-white text-indigo-600 px-8 py-4 rounded-md font-medium text-lg flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="border-2 border-white text-white px-8 py-4 rounded-md font-medium text-lg flex items-center justify-center hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              Schedule a Demo
            </button>
          </div>
          <p className="mt-6 text-indigo-200">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center mb-6">
                <Trophy className="h-8 w-8 text-indigo-400 mr-2" />
                <span className="text-2xl font-bold text-white">Revino</span>
              </div>
              <p className="mb-6">
                The comprehensive platform for dealer incentive programs that drive results.
              </p>
              <div className="flex space-x-4">
                {/* Social Media Icons */}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-white text-lg mb-6">Product</h3>
              <ul className="space-y-4">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Solutions</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/demo" className="hover:text-white transition-colors">Demo</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white text-lg mb-6">Resources</h3>
              <ul className="space-y-4">
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/case-studies" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="/documentation" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/webinars" className="hover:text-white transition-colors">Webinars</a></li>
                <li><a href="/help-center" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white text-lg mb-6">Company</h3>
              <ul className="space-y-4">
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/partners" className="hover:text-white transition-colors">Partners</a></li>
                <li><a href="/legal" className="hover:text-white transition-colors">Legal</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p>© {new Date().getFullYear()} Revino. All rights reserved.</p>
            <div className="flex mt-4 md:mt-0">
              <a href="/privacy" className="mr-6 hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Back to Top Button */}
      <button 
        className={`fixed bottom-8 right-8 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronUp className="h-6 w-6" />
      </button>
      
      {/* Demo Request Modal - You can implement this with useState */}
      
      {/* Newsletter Signup Modal - You can implement this with useState */}
      
      {/* Chatbot Widget - You can implement this with useState */}
    </div>
  );
};

export default HomePage;