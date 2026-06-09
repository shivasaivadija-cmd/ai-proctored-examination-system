import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Progress = ({ value = 0, className, ...props }) => {
  return (
    <div className={cn('w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', className)} {...props}>
      <motion.div
        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

export const StepProgress = ({ steps, currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={step.id || index}>
              {/* Step indicator */}
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Circle */}
                <motion.div
                  className={cn(
                    'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300',
                    isCompleted && 'bg-success-500 border-success-500 text-white',
                    isCurrent && 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30 animate-pulse-glow',
                    isUpcoming && 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                  )}
                  whileHover={{ scale: 1.05 }}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                  
                  {/* Glow effect for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary-500 opacity-30 blur-xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p className={cn(
                    'text-xs font-medium',
                    isCompleted && 'text-success-600 dark:text-success-400',
                    isCurrent && 'text-primary-600 dark:text-primary-400 font-semibold',
                    isUpcoming && 'text-gray-500 dark:text-gray-400'
                  )}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 mb-8 bg-gray-200 dark:bg-gray-700 relative">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary-500 to-success-500"
                    initial={{ width: '0%' }}
                    animate={{ width: index < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Overall progress bar */}
      <Progress value={(currentStep / (steps.length - 1)) * 100} className="mt-6" />
    </div>
  );
};

Progress.displayName = 'Progress';
StepProgress.displayName = 'StepProgress';
