import { useState } from "react";
import {
  CodeCommit,
  ChartBar,
  Sparkles,
  BugAntSolid,
  CloudArrowUp,
  DocumentText,
} from "@medusajs/icons";

interface ExamplePrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  category: "code" | "deploy" | "analyze" | "create";
}

const examplePrompts: ExamplePrompt[] = [
  {
    id: "1",
    title: "Build a React Dashboard",
    description: "Create and deploy a complete analytics dashboard with charts",
    prompt:
      "Build a React dashboard with charts showing sales data, deploy it in a container so I can preview it",
    icon: ChartBar,
    category: "deploy",
  },
  {
    id: "2",
    title: "Debug Python Code",
    description: "Analyze and fix issues in your Python scripts",
    prompt:
      "Help me debug this Python script that's throwing errors when processing CSV files",
    icon: BugAntSolid,
    category: "code",
  },
  {
    id: "3",
    title: "Deploy API Server",
    description: "Create and deploy a REST API with database integration",
    prompt:
      "Create a Node.js API server with user authentication and deploy it in a sandbox container",
    icon: CloudArrowUp,
    category: "deploy",
  },
  {
    id: "4",
    title: "Analyze Data Trends",
    description: "Process datasets and generate insights with visualizations",
    prompt:
      "Analyze this sales data CSV and create interactive visualizations showing trends and patterns",
    icon: Sparkles,
    category: "analyze",
  },
  {
    id: "5",
    title: "Generate Documentation",
    description: "Create comprehensive docs for your codebase",
    prompt:
      "Generate API documentation with examples for my Express.js backend",
    icon: DocumentText,
    category: "create",
  },
  {
    id: "6",
    title: "Code Review & Refactor",
    description: "Get detailed code reviews and refactoring suggestions",
    prompt:
      "Review this React component and suggest improvements for readability and maintainability",
    icon: CodeCommit,
    category: "code",
  },
];

const categoryColors = {
  code: {
    bg: "bg-ui-tag-blue-bg hover:bg-ui-tag-blue-bg-hover",
    border: "border-ui-tag-blue-border",
    text: "text-ui-tag-blue-text",
    icon: "text-ui-tag-blue-icon",
  },
  deploy: {
    bg: "bg-ui-tag-green-bg hover:bg-ui-tag-green-bg-hover",
    border: "border-ui-tag-green-border",
    text: "text-ui-tag-green-text",
    icon: "text-ui-tag-green-icon",
  },
  analyze: {
    bg: "bg-ui-tag-purple-bg hover:bg-ui-tag-purple-bg-hover",
    border: "border-ui-tag-purple-border",
    text: "text-ui-tag-purple-text",
    icon: "text-ui-tag-purple-icon",
  },
  create: {
    bg: "bg-ui-tag-orange-bg hover:bg-ui-tag-orange-bg-hover",
    border: "border-ui-tag-orange-border",
    text: "text-ui-tag-orange-text",
    icon: "text-ui-tag-orange-icon",
  },
};

interface ExamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
}

export default function ExamplePrompts({
  onPromptSelect,
}: ExamplePromptsProps) {
  const [selectedCategory, _setSelectedCategory] = useState<string | null>(
    null,
  );

  const filteredPrompts = selectedCategory
    ? examplePrompts.filter((p) => p.category === selectedCategory)
    : examplePrompts;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-sm text-ui-fg-muted">
          Try these examples or describe your own project
        </p>
      </div>

      {/* Compact Examples Grid */}
      <div className="w-full">
        {/* Mobile: 2 columns, smaller cards */}
        <div className="grid grid-cols-2 sm:hidden gap-2 max-h-[55vh] overflow-y-auto px-1">
          {filteredPrompts.map((example) => {
            const colors = categoryColors[example.category];
            const IconComponent = example.icon;

            return (
              <button
                key={example.id}
                onClick={() => onPromptSelect(example.prompt)}
                className="group p-3 bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base rounded-md text-left transition-all duration-200 hover:border-ui-border-strong hover:shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded ${colors.bg} ${colors.border} border shrink-0`}
                  >
                    <IconComponent className={`w-3 h-3 ${colors.icon}`} />
                  </div>
                  <h3 className="font-medium text-ui-fg-base text-xs leading-tight group-hover:text-ui-fg-interactive transition-colors">
                    {example.title}
                  </h3>
                </div>
                <p className="text-[10px] text-ui-fg-muted leading-tight line-clamp-2">
                  {example.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Tablet: 3 columns */}
        <div className="hidden sm:grid lg:hidden grid-cols-3 gap-2 max-h-[45vh] overflow-y-auto px-1">
          {filteredPrompts.map((example) => {
            const colors = categoryColors[example.category];
            const IconComponent = example.icon;

            return (
              <button
                key={example.id}
                onClick={() => onPromptSelect(example.prompt)}
                className="group p-3 bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base rounded-md text-left transition-all duration-200 hover:border-ui-border-strong hover:shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded ${colors.bg} ${colors.border} border shrink-0`}
                  >
                    <IconComponent className={`w-3 h-3 ${colors.icon}`} />
                  </div>
                  <h3 className="font-medium text-ui-fg-base text-xs leading-tight group-hover:text-ui-fg-interactive transition-colors">
                    {example.title}
                  </h3>
                </div>
                <p className="text-[10px] text-ui-fg-muted leading-tight line-clamp-2">
                  {example.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Desktop: 3 columns, 2 rows, compact layout */}
        <div className="hidden lg:grid grid-cols-3 gap-3 px-2">
          {filteredPrompts.map((example) => {
            const colors = categoryColors[example.category];
            const IconComponent = example.icon;

            return (
              <button
                key={example.id}
                onClick={() => onPromptSelect(example.prompt)}
                className="group p-3 bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base rounded-md text-left transition-all duration-200 hover:border-ui-border-strong hover:shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className={`p-1.5 rounded ${colors.bg} ${colors.border} border shrink-0`}
                  >
                    <IconComponent className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <h3 className="font-medium text-ui-fg-base text-sm leading-tight group-hover:text-ui-fg-interactive transition-colors">
                    {example.title}
                  </h3>
                </div>
                <p className="text-xs text-ui-fg-muted leading-relaxed line-clamp-2">
                  {example.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-ui-fg-subtle">
          Tavor runs code, deploys apps, and creates live previews in secure
          containers.
        </p>
      </div>
    </div>
  );
}
