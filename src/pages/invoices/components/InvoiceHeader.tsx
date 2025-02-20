
import { ArrowLeft, MoreHorizontal, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceHeaderProps {
  invoiceNumber: string;
  onNavigateBack: () => void;
  onShare?: () => void;
  onSave: () => void;
  isLoading?: boolean;
}

export function InvoiceHeader({ 
  invoiceNumber, 
  onNavigateBack, 
  onShare, 
  onSave, 
  isLoading 
}: InvoiceHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigateBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">
          Invoice #{invoiceNumber}
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        {onShare && (
          <Button variant="outline" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
        <Button onClick={onSave} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
