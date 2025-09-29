"use client";

import { useState } from 'react';
import { Check, ChevronsUpDown, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSubjects } from '../hooks/useSubjects';
import { Subject, SubjectSelectorProps } from '../types';
import { SubjectForm } from './subject-form';

export const SubjectSelector = ({
  subjects: propSubjects,
  selectedSubjectId,
  onSelect,
  placeholder = "Select subject...",
  allowEmpty = true,
}: SubjectSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Use prop subjects if provided, otherwise fetch from API
  const { data: fetchedSubjects } = useSubjects({ includeArchived: false, limit: 100 });
  const subjects = propSubjects || fetchedSubjects?.items || [];

  const selectedSubject = subjects.find(subject => subject.id === selectedSubjectId);

  const handleSelect = (subjectId: string) => {
    onSelect(subjectId);
    setOpen(false);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedSubject ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedSubject.color }}
                />
                <span>{selectedSubject.name}</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search subjects..." />
            <CommandEmpty>
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No subjects found.</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Subject
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value=""
                  onSelect={() => handleSelect('')}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !selectedSubjectId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">No subject</span>
                </CommandItem>
              )}
              {subjects.map((subject) => (
                <CommandItem
                  key={subject.id}
                  value={subject.name}
                  onSelect={() => handleSelect(subject.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedSubjectId === subject.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span>{subject.name}</span>
                  </div>
                </CommandItem>
              ))}
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  setIsCreateDialogOpen(true);
                }}
                className="border-t"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create new subject
              </CommandItem>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          <SubjectForm
            onSubmit={handleCreateSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

// Simpler variant for forms
export const SimpleSubjectSelector = ({
  value,
  onChange,
  placeholder = "Select subject...",
  ...props
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
} & Omit<SubjectSelectorProps, 'selectedSubjectId' | 'onSelect'>) => {
  return (
    <SubjectSelector
      {...props}
      selectedSubjectId={value}
      onSelect={onChange}
      placeholder={placeholder}
    />
  );
};