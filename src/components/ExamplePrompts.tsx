import { useState } from "react";
import {
  CodeCommit,
  ChartBar,
  Sparkles,
  BugAntSolid,
  CloudArrowUp,
  DocumentText,
  ChatBubble,
  Photo,
  ShoppingCart,
  GlobeEurope,
  ServerStack,
} from "@medusajs/icons";
import { Calculator, Container, Smartphone, Gamepad2 } from "lucide-react";

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
    title: "Build & Deploy React Portfolio",
    description: "Create a modern portfolio site with animations and deploy it live",
    prompt: "Create a modern React portfolio website with smooth animations and a contact form. Install git, node, npm, then build and deploy it so I can see the live preview URL",
    icon: ChartBar,
    category: "deploy",
  },
  {
    id: "2",
    title: "Python Data Science Pipeline",
    description: "Process datasets with pandas and create visualizations",
    prompt: "I have sales data in CSV format. Install python3, pandas, matplotlib, and seaborn. Create a complete data analysis pipeline that shows sales trends, customer segments, and generates beautiful charts",
    icon: Sparkles,
    category: "analyze",
  },
  {
    id: "3",
    title: "Go REST API with Database",
    description: "Build a high-performance API server with SQLite",
    prompt: "Install git, golang, and create a REST API for a task management system with SQLite database. Include CRUD operations, middleware for logging, and deploy it so I can test the endpoints",
    icon: CloudArrowUp,
    category: "deploy",
  },
  {
    id: "4",
    title: "Astro Blog with MDX",
    description: "Create a lightning-fast blog site with Astro framework",
    prompt: "Install git, node, npm, then create an Astro blog with MDX support, Tailwind CSS styling, and sample blog posts. Build and deploy it for a live preview",
    icon: DocumentText,
    category: "deploy",
  },
  {
    id: "5",
    title: "Machine Learning Model Training",
    description: "Train a model and visualize results with scikit-learn",
    prompt: "Install python3, scikit-learn, pandas, and matplotlib. Create a machine learning model to predict house prices using sample data, train it, evaluate performance, and show visualizations of the results",
    icon: BugAntSolid,
    category: "analyze",
  },
  {
    id: "6",
    title: "Rust Web Server",
    description: "Build a blazing-fast web server with Rust and Actix",
    prompt: "Install git, rust, cargo, then create a web server using Actix-web with JSON API endpoints, static file serving, and middleware. Deploy it and provide the preview URL",
    icon: CodeCommit,
    category: "deploy",
  },
  {
    id: "7",
    title: "Real-time Chat App",
    description: "Create a WebSocket chat application with Node.js",
    prompt: "Install git, node, npm, then build a real-time chat application using Express.js and Socket.io. Include user authentication, message history, and deploy it for live testing",
    icon: ChatBubble,
    category: "deploy",
  },
  {
    id: "8",
    title: "Financial Calculator",
    description: "Build complex financial calculations with Python",
    prompt: "Create a comprehensive financial calculator in Python that computes compound interest, loan payments, investment returns, and retirement planning. Include interactive input and detailed output formatting",
    icon: Calculator,
    category: "code",
  },
  {
    id: "9",
    title: "Docker Multi-Service App",
    description: "Deploy a multi-container application with Docker Compose",
    prompt: "Install git, docker, docker-compose, then create a full-stack application with React frontend, Node.js API, and PostgreSQL database using docker-compose. Deploy and show me the live application",
    icon: Container,
    category: "deploy",
  },
  {
    id: "10",
    title: "Image Processing Pipeline",
    description: "Process and transform images with Python PIL",
    prompt: "Install python3, Pillow, numpy, and opencv. Create an image processing pipeline that can resize, apply filters, detect edges, and create thumbnails. Show examples with sample images",
    icon: Photo,
    category: "analyze",
  },
  {
    id: "11",
    title: "Vue.js E-commerce Demo",
    description: "Build a complete shopping cart with Vue 3 and Vite",
    prompt: "Install git, node, npm, then create a Vue 3 e-commerce site with Vite, including product catalog, shopping cart, checkout flow, and modern UI. Build and deploy for preview",
    icon: ShoppingCart,
    category: "deploy",
  },
  {
    id: "12",
    title: "Python Web Scraper",
    description: "Extract and analyze data from websites",
    prompt: "Install python3, requests, beautifulsoup4, and pandas. Create a web scraper that extracts product prices from e-commerce sites, stores data in CSV, and generates price comparison reports",
    icon: GlobeEurope,
    category: "code",
  },
  {
    id: "13",
    title: "FastAPI + React Full Stack",
    description: "Deploy a modern full-stack application",
    prompt: "Install git, python3, pip, node, npm. Create a FastAPI backend with SQLAlchemy ORM and React frontend with TypeScript. Include user authentication, CRUD operations, and deploy both services",
    icon: ServerStack,
    category: "deploy",
  },
  {
    id: "14",
    title: "Game Development with Python",
    description: "Create an interactive game with Pygame",
    prompt: "Install python3, pygame, and create a complete 2D game like Snake or Tetris with scoring, levels, and smooth gameplay. Include game instructions and controls",
    icon: Gamepad2,
    category: "code",
  },
  {
    id: "15",
    title: "Svelte PWA Dashboard",
    description: "Build a Progressive Web App with SvelteKit",
    prompt: "Install git, node, npm, then create a SvelteKit PWA dashboard with offline capabilities, push notifications, and responsive design. Build and deploy for mobile-ready preview",
    icon: Smartphone,
    category: "deploy",
  }
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
