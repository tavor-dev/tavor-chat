import { useState } from "react";
import { ChartBar, RocketLaunch, DocumentText } from "@medusajs/icons";

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
    title: "Go API with SQLite",
    description: "Complete REST API with database, ready to test",
    prompt:
      "Create a Go REST API for a simple task manager with SQLite database. Run 'apt update && apt install -y golang-go sqlite3 > /dev/null 2>&1', create main.go with CRUD endpoints for tasks (GET /tasks, POST /tasks, PUT /tasks/:id, DELETE /tasks/:id), initialize SQLite database, then 'nohup go run main.go &' on port 8080. Include sample data and JSON responses.",
    icon: RocketLaunch,
    category: "deploy",
  },
  {
    id: "2",
    title: "Astro Blog Deployment",
    description: "Beautiful blog site deployed from GitHub template",
    prompt:
      "Deploy the Astro blog from https://github.com/Charca/astro-blog-template. Run 'apt update && apt install -y git nodejs npm > /dev/null 2>&1', clone the repo, install dependencies, build the site, then serve it with 'nohup npm run dev -- --host 0.0.0.0 &' so I can see the preview URL.",
    icon: DocumentText,
    category: "deploy",
  },
  {
    id: "3",
    title: "Data Analysis Script",
    description: "Python script analyzing sales data with charts",
    prompt:
      "Create a Python script that analyzes sample sales data (generate 100 random sales records). Run 'apt update && apt install -y python3 python3-pip > /dev/null 2>&1', install pandas and matplotlib, then create analysis showing monthly revenue trends, top products, and customer segments. Generate charts and summary statistics.",
    icon: ChartBar,
    category: "analyze",
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
