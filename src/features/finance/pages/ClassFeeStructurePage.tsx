import React from 'react';

export const ClassFeeStructurePage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Class Fee Structure Details
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage and configure class-specific fee structures and transport charges.
        </p>
      </div>
    </div>
  );
};
