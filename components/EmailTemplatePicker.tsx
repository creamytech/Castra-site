"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/ui/theme";

interface Template {
  id: string;
  name: string;
  type: string;
  subject?: string;
  content: string;
  variables: string[];
}

interface EmailTemplatePickerProps {
  onTemplateSelect: (template: Template, resolvedContent: string, resolvedSubject: string) => void;
  contactData?: Record<string, string>; // For variable resolution
  className?: string;
}

export default function EmailTemplatePicker({ 
  onTemplateSelect, 
  contactData = {}, 
  className = "" 
}: EmailTemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveVariables = (content: string, subject?: string) => {
    let resolvedContent = content;
    let resolvedSubject = subject || "";

    // Replace variables with contact data
    Object.entries(contactData).forEach(([key, value]) => {
      const variable = `{{${key}}}`;
      resolvedContent = resolvedContent.replace(new RegExp(variable, 'g'), value || '');
      if (resolvedSubject) {
        resolvedSubject = resolvedSubject.replace(new RegExp(variable, 'g'), value || '');
      }
    });

    // Replace common variables
    const commonVars = {
      '{{firstName}}': contactData.firstName || '[First Name]',
      '{{lastName}}': contactData.lastName || '[Last Name]',
      '{{fullName}}': `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || '[Full Name]',
      '{{company}}': contactData.company || '[Company]',
      '{{email}}': contactData.email || '[Email]',
      '{{phone}}': contactData.phone || '[Phone]',
      '{{date}}': new Date().toLocaleDateString(),
      '{{time}}': new Date().toLocaleTimeString(),
    };

    Object.entries(commonVars).forEach(([variable, value]) => {
      resolvedContent = resolvedContent.replace(new RegExp(variable, 'g'), value);
      if (resolvedSubject) {
        resolvedSubject = resolvedSubject.replace(new RegExp(variable, 'g'), value);
      }
    });

    return { resolvedContent, resolvedSubject };
  };

  const handleTemplateSelect = (template: Template) => {
    const { resolvedContent, resolvedSubject } = resolveVariables(template.content, template.subject);
    onTemplateSelect(template, resolvedContent, resolvedSubject);
    setSelectedTemplate(template);
    setIsOpen(false);
  };

  const handleCreateTemplate = () => {
    // Open template creation modal or navigate to template page
    window.open('/app/templates/new', '_blank');
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary text-sm flex items-center space-x-2"
      >
        <span>📧</span>
        <span>Templates</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-surface-50 dark:bg-surface-800 border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text">Email Templates</h3>
              <button
                onClick={handleCreateTemplate}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                + New
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-text-muted">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                <p>No templates found</p>
                <button
                  onClick={handleCreateTemplate}
                  className="text-brand-600 hover:text-brand-700 text-sm mt-2"
                >
                  Create your first template
                </button>
              </div>
            ) : (
              <div className="p-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-3 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-md transition-colors"
                  >
                    <div className="font-medium text-text">{template.name}</div>
                    {template.subject && (
                      <div className="text-sm text-text-muted mt-1">
                        Subject: {template.subject}
                      </div>
                    )}
                    <div className="text-xs text-text-muted mt-1 line-clamp-2">
                      {template.content.substring(0, 100)}...
                    </div>
                    {template.variables.length > 0 && (
                      <div className="text-xs text-brand-600 mt-1">
                        Variables: {template.variables.join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
