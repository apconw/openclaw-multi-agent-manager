import { Check, Users, KeyRound, GitFork, Eye, Rocket } from 'lucide-react';
import type { WizardStep } from '../types';

const steps: { key: WizardStep; label: string; icon: typeof Users }[] = [
  { key: 'select', label: '选择角色', icon: Users },
  { key: 'credentials', label: '配置凭证', icon: KeyRound },
  { key: 'collaboration', label: '协作关系', icon: GitFork },
  { key: 'preview', label: '预览配置', icon: Eye },
  { key: 'done', label: '完成初始化', icon: Rocket },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-0 py-8">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : isActive
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-100'
                      : 'bg-gray-100 text-gray-400'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-brand-600' : isCompleted ? 'text-brand-500' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-1.5 mb-6 transition-colors duration-300 ${
                  index < currentIndex ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
