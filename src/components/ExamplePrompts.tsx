import { useState } from "react";
import {
  ChartBar,
  RocketLaunch,
  DocumentText,
  ChartPie,
  ChatBubble,
} from "@medusajs/icons";
import { Download } from "lucide-react";

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
      "I need a Go REST API for managing tasks with SQLite storage. Please follow this order: First, set up the environment by running 'apt update && apt install -y golang-go sqlite3 > /dev/null 2>&1'. Then create a main.go file with these specific requirements: use gorilla/mux for routing, implement exactly these endpoints - GET /tasks (list all), POST /tasks (create new), PUT /tasks/:id (update existing), DELETE /tasks/:id (remove task). Each task should have id, title, description, completed status, and created_at timestamp. Initialize the SQLite database with proper schema including auto-incrementing primary key. Add some sample tasks for testing. Make sure to handle JSON properly and include CORS headers. Finally, start the server in background with 'nohup go run main.go &' on port 8080. Test each endpoint works and show me the preview URL.",
    icon: RocketLaunch,
    category: "deploy",
  },
  {
    id: "2",
    title: "Astro Blog Deployment",
    description: "Beautiful blog site deployed from GitHub template",
    prompt:
      "I want to deploy an Astro blog from the template at https://github.com/Charca/astro-blog-template. Here's the step-by-step process I need: Start by installing dependencies with 'apt update && apt install -y git nodejs npm > /dev/null 2>&1'. Clone the repository using git clone, then navigate into the project directory. Check the package.json to understand the available scripts. Install all npm dependencies, then build the project if needed. Configure the development server to accept external connections by running it with host binding to 0.0.0.0. Start the server in background mode using 'nohup npm run dev -- --host 0.0.0.0 &' so it stays running. Verify the site loads properly and provide me with the preview URL. If there are any port conflicts, use a different port and let me know.",
    icon: DocumentText,
    category: "deploy",
  },
  {
    id: "3",
    title: "Data Analysis Script",
    description: "Python script analyzing sales data with charts",
    prompt:
      "Create a comprehensive sales data analysis in Python. First, prepare the environment: run 'apt update && apt install -y python3 python3-pip > /dev/null 2>&1', then install pandas, matplotlib, and seaborn. Generate a realistic dataset of 100+ sales records with these fields: date (last 12 months), product_name, category, quantity, unit_price, customer_id, and region. Create multiple analysis outputs: 1) Monthly revenue trends line chart, 2) Top 10 products by revenue bar chart, 3) Sales by category pie chart, 4) Customer segmentation analysis (group by total spend), 5) Regional performance comparison. Include summary statistics like total revenue, average order value, and growth rates. Save all charts as PNG files and create a summary report. Make the code well-commented and modular with separate functions for data generation, analysis, and visualization. Print key insights to console.",
    icon: ChartBar,
    category: "analyze",
  },
  {
    id: "4",
    title: "React Dashboard with API",
    description: "Interactive dashboard consuming real-time data",
    prompt:
      "Build a React dashboard that displays cryptocurrency prices. Setup process: Install Node.js and npm with 'apt update && apt install -y nodejs npm > /dev/null 2>&1'. Create a React app using create-react-app or Vite. The dashboard should fetch data from a public crypto API (like CoinGecko) and display: 1) Price cards for top 5 cryptocurrencies with current price, 24h change, and percentage change (color-coded), 2) A line chart showing price history for selected coin, 3) A data table with sortable columns, 4) Auto-refresh every 30 seconds. Use modern React with hooks, add loading states and error handling. Style with CSS or a framework like Tailwind. Include a header with last updated timestamp. Start the development server with 'nohup npm start &' bound to all interfaces so I can access the preview URL. Handle CORS if needed.",
    icon: ChartPie,
    category: "deploy",
  },
  {
    id: "5",
    title: "Python Web Scraper",
    description: "Automated data collection with CSV export",
    prompt:
      "Create a Python web scraper for collecting product information from a demo e-commerce site. Environment setup: 'apt update && apt install -y python3 python3-pip > /dev/null 2>&1', then install requests, beautifulsoup4, pandas, and selenium if needed. Target a site like books.toscrape.com or similar demo site. Extract these fields: product name, price, rating, availability, and category. Implement proper scraping etiquette: add delays between requests, respect robots.txt, handle errors gracefully. Process multiple pages (at least 5 pages of results). Clean and validate the data, then export to CSV with proper headers. Add progress indicators and logging. Include data quality checks like duplicate detection and missing value handling. Create summary statistics showing total products scraped, price ranges by category, and rating distributions. Make the scraper configurable with variables for delays, max pages, and output filename.",
    icon: Download,
    category: "analyze",
  },
  {
    id: "6",
    title: "Node.js Chat Application",
    description: "Real-time chat with Socket.io deployment",
    prompt:
      "Build a real-time chat application using Node.js and Socket.io. Setup: 'apt update && apt install -y nodejs npm > /dev/null 2>&1'. Create a server with Express and Socket.io that handles: 1) User connections and disconnections with welcome messages, 2) Broadcasting messages to all connected users, 3) Display of active user count, 4) Simple message history (store last 50 messages in memory). Create a clean HTML/CSS frontend with: message input field, send button, messages display area, online users counter, and responsive design. Implement features like: username setting, timestamp on messages, typing indicators, and basic emoji support. Include error handling for connection issues. Serve static files and start with 'nohup node server.js &' on port 3000. Test with multiple browser windows to verify real-time functionality works. Provide the preview URL for testing.",
    icon: ChatBubble,
    category: "deploy",
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
  disabled?: boolean;
}

export default function ExamplePrompts({
  onPromptSelect,
  disabled = false,
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
        {disabled ? (
          <p className="text-xs text-ui-fg-subtle mt-2 px-4">
            Example prompts are only enabled for models with advanced agentic
            capabilities, like Claude 4 Sonnet, O4 Mini, or Gemini 2.5 Pro.
            Please select one of these models to use the examples.
          </p>
        ) : (
          <p className="text-sm text-ui-fg-muted">
            Try these examples or describe your own project
          </p>
        )}
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
                disabled={disabled}
                className="group p-3 bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base rounded-md text-left transition-all duration-200 hover:border-ui-border-strong hover:shadow-sm disabled:opacity-50 disabled:hover:bg-ui-bg-component disabled:hover:border-ui-border-base disabled:hover:shadow-none"
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
                disabled={disabled}
                className="group p-3 bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base rounded-md text-left transition-all duration-200 hover:border-ui-border-strong hover:shadow-sm disabled:opacity-50 disabled:hover:bg-ui-bg-component disabled:hover:border-ui-border-base disabled:hover:shadow-none"
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
                disabled={disabled}
                className="group p-3 bg-ui-bg-component hover:bg-ui-bg-component-hover border border-ui-border-base rounded-md text-left transition-all duration-200 hover:border-ui-border-strong hover:shadow-sm disabled:opacity-50  disabled:hover:bg-ui-bg-component disabled:hover:border-ui-border-base disabled:hover:shadow-none"
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
