import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Camera, Mic, Wifi, Check, Chrome, Clock, FileText,
  AlertCircle, User, Award, PlayCircle, ChevronRight, Sparkles,
  CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export function WelcomeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [systemChecks, setSystemChecks] = useState({
    camera: 'checking',
    microphone: 'checking',
    internet: 'checking',
    browser: 'checking',
  });

  // Simulate system checks
  useEffect(() => {
    const checkSystem = async () => {
      // Browser check
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      setTimeout(() => {
        setSystemChecks(prev => ({ ...prev, browser: isChrome ? 'success' : 'warning' }));
      }, 500);

      // Internet check
      setTimeout(() => {
        setSystemChecks(prev => ({ ...prev, internet: navigator.onLine ? 'success' : 'error' }));
      }, 800);

      // Camera check
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setTimeout(() => {
          setSystemChecks(prev => ({ ...prev, camera: 'success' }));
        }, 1200);
      } catch {
        setTimeout(() => {
          setSystemChecks(prev => ({ ...prev, camera: 'error' }));
        }, 1200);
      }

      // Microphone check
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setTimeout(() => {
          setSystemChecks(prev => ({ ...prev, microphone: 'success' }));
        }, 1500);
      } catch {
        setTimeout(() => {
          setSystemChecks(prev => ({ ...prev, microphone: 'error' }));
        }, 1500);
      }
    };

    checkSystem();
  }, []);

  const examDetails = {
    name: 'Full Stack Developer Assessment',
    duration: '60 minutes',
    questions: 20,
    marks: 100,
    passingScore: 70,
  };

  const allSystemsReady = Object.values(systemChecks).every(status => status === 'success' || status === 'warning');

  return (
    <div className="min-h-screen mesh-gradient grid-pattern">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              AI-Powered Proctoring
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to Your
            <span className="block text-gradient mt-2">Secure Examination</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Complete the verification process to begin your assessment in a secure, monitored environment
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column - Candidate Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card glass glow className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-success-500 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {user?.name || 'Candidate'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user?.email}
                    </p>
                    <Badge variant="primary" className="mt-2">
                      <User className="w-3 h-3" />
                      Candidate ID: {user?.id || '---'}
                    </Badge>
                  </div>
                </div>

                <div className="divider my-6" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
                    <Badge variant="success" dot pulse>Verified</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Session ID</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Middle Column - Exam Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card glass className="h-full border-2 border-primary-500/20">
              <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{examDetails.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Technical Assessment
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <motion.div
                    className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Clock className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {examDetails.duration}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                  </motion.div>

                  <motion.div
                    className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800"
                    whileHover={{ scale: 1.02 }}
                  >
                    <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {examDetails.questions}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Questions</p>
                  </motion.div>

                  <motion.div
                    className="p-4 rounded-xl bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border border-success-200 dark:border-success-800"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Award className="w-8 h-8 text-success-600 dark:text-success-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {examDetails.marks}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Marks</p>
                  </motion.div>

                  <motion.div
                    className="p-4 rounded-xl bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border border-warning-200 dark:border-warning-800"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Shield className="w-8 h-8 text-warning-600 dark:text-warning-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {examDetails.passingScore}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Passing Score</p>
                  </motion.div>
                </div>

                <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-warning-900 dark:text-warning-100 mb-1">
                        Important Rules
                      </p>
                      <ul className="text-xs text-warning-800 dark:text-warning-200 space-y-1">
                        <li>• No switching tabs or windows</li>
                        <li>• Keep face visible at all times</li>
                        <li>• No external devices allowed</li>
                        <li>• Stay in fullscreen mode</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - System Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card glass className="h-full">
              <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50 p-6">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-500" />
                  System Status
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-4">
                  <SystemCheckItem
                    icon={Camera}
                    label="Camera Access"
                    status={systemChecks.camera}
                  />
                  <SystemCheckItem
                    icon={Mic}
                    label="Microphone Access"
                    status={systemChecks.microphone}
                  />
                  <SystemCheckItem
                    icon={Wifi}
                    label="Internet Connection"
                    status={systemChecks.internet}
                  />
                  <SystemCheckItem
                    icon={Chrome}
                    label="Browser Compatibility"
                    status={systemChecks.browser}
                  />
                </div>

                <div className="divider my-6" />

                {allSystemsReady ? (
                  <motion.div
                    className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-success-600 dark:text-success-400" />
                      <div>
                        <p className="text-sm font-semibold text-success-900 dark:text-success-100">
                          All Systems Ready
                        </p>
                        <p className="text-xs text-success-700 dark:text-success-300">
                          You can proceed with verification
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
                      <div>
                        <p className="text-sm font-semibold text-warning-900 dark:text-warning-100">
                          System Checks In Progress
                        </p>
                        <p className="text-xs text-warning-700 dark:text-warning-300">
                          Please wait while we verify your setup
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* CTA Button */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            size="xl"
            disabled={!allSystemsReady}
            onClick={() => navigate('/verification')}
            icon={PlayCircle}
            iconPosition="left"
            className="shadow-2xl"
          >
            Begin Verification Process
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Complete 5 verification steps • Estimated time: 2-3 minutes
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// System Check Item Component
function SystemCheckItem({ icon: Icon, label, status }) {
  const statusConfig = {
    checking: { color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: motion.div },
    success: { color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/20', icon: CheckCircle2 },
    warning: { color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/20', icon: AlertCircle },
    error: { color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-50 dark:bg-danger-900/20', icon: XCircle },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      className={`flex items-center justify-between p-4 rounded-xl ${config.bg} border border-gray-200 dark:border-gray-700`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${config.color}`} />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
      </div>
      {status === 'checking' ? (
        <motion.div
          className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <StatusIcon className={`w-5 h-5 ${config.color}`} />
      )}
    </motion.div>
  );
}
