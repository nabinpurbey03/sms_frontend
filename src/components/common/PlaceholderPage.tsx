import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PlaceholderPage: React.FC<{ title: string; description?: string }> = ({
  title,
  description = 'This feature module will be wired up in the upcoming phase according to PLAN.md.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-3 sm:p-6 w-full">
      <Card className="max-w-md w-full text-center border-dashed border-2 rounded-2xl p-4 sm:p-6 shadow-xs">
        <CardHeader className="space-y-2 p-0 pb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Construction className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Button
            variant="outline"
            className="w-full sm:w-auto font-semibold min-h-[44px] sm:min-h-9"
            asChild
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
