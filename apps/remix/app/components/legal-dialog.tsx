import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@bchatsign/ui/primitives/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type LegalDialogProps = {
  children: React.ReactNode;
  title: string;
  content: string;
};

export const LegalDialog = ({ children, title, content }: LegalDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
