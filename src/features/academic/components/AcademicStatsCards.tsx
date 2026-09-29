import React from 'react';
import { BookOpen, Layers, Users, GraduationCap, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { AcademicStats } from '../types';

interface AcademicStatsCardsProps {
  stats: AcademicStats & { configuredSubjects?: number };
  isLoading?: boolean;
}

export const AcademicStatsCards: React.FC<AcademicStatsCardsProps> = ({
  stats,
  isLoading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Classes"
        value={stats.totalClasses}
        icon={BookOpen}
        description="Configured academic levels"
        variant="default"
        loading={isLoading}
      />
      <StatCard
        title="Active Sections"
        value={stats.totalSections}
        icon={Layers}
        description="Auto & sequentially provisioned"
        variant="blue"
        loading={isLoading}
      />
      <StatCard
        title="Enrolled Students"
        value={stats.totalStudents}
        icon={Users}
        description="Active across all sections"
        variant="emerald"
        loading={isLoading}
      />
      {stats.configuredSubjects !== undefined ? (
        <StatCard
          title="Configured Subjects"
          value={stats.configuredSubjects}
          icon={GraduationCap}
          description="Curriculum course offerings"
          variant="purple"
          loading={isLoading}
        />
      ) : (
        <StatCard
          title="Avg Section Size"
          value={stats.avgStudentsPerSection}
          icon={TrendingUp}
          description="Target: ≥ 20 for expansion"
          variant="purple"
          loading={isLoading}
        />
      )}
    </div>
  );
};

