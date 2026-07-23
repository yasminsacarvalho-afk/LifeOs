import re

with open("src/routes/growth.tsx", "r") as f:
    content = f.read()

# 1. Imports
if "GrowthStrategyTab" not in content:
    content = content.replace(
        'import { CompetitorPriceFormModal } from "@/components/CompetitorPriceFormModal";',
        'import { CompetitorPriceFormModal } from "@/components/CompetitorPriceFormModal";\nimport { GrowthStrategyTab } from "@/components/GrowthStrategyTab";'
    )

# 2. State setup
if "const [dynamicTabs" not in content:
    state_setup = """  const [activeTab, setActiveTab] = useState<string>("tests");
  
  // Local State
  const [dynamicTabs, setDynamicTabs] = useState<any[]>(() => {
    const saved = localStorage.getItem("vf_growth_dynamic_tabs");
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem("vf_growth_dynamic_tabs", JSON.stringify(dynamicTabs));
  }, [dynamicTabs]);"""
    
    content = re.sub(
        r'  const \[activeTab, setActiveTab\] = useState<"tests" \| "competitors">\("tests"\);\n  \n  // Local State',
        state_setup,
        content
    )

# 3. Tab Navigation
tab_nav_find = """        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border">
          <button 
            onClick={() => setActiveTab("tests")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2", activeTab === "tests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><TestTube2 className="size-4" /> Gestão de Tráfego & CAC</div>
          </button>
          <button 
            onClick={() => setActiveTab("competitors")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2", activeTab === "competitors" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><SearchCheck className="size-4" /> Monitoramento da Concorrência</div>
          </button>
        </div>"""

tab_nav_replace = """        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button 
            onClick={() => setActiveTab("tests")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === "tests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><TestTube2 className="size-4" /> Gestão de Tráfego & CAC</div>
          </button>
          <button 
            onClick={() => setActiveTab("competitors")}
            className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === "competitors" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <div className="flex items-center gap-2"><SearchCheck className="size-4" /> Monitoramento da Concorrência</div>
          </button>

          {dynamicTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn("px-6 py-3 font-medium text-sm transition-colors border-b-2 flex-shrink-0", activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              <div className="flex items-center gap-2"><Target className="size-4" /> {tab.title}</div>
            </button>
          ))}

          <button 
            onClick={() => {
              const newTab = { id: generateId(), title: "Nova Estratégia", content: "", pinnedMetrics: [] };
              setDynamicTabs([...dynamicTabs, newTab]);
              setActiveTab(newTab.id);
            }}
            className="px-4 py-3 font-medium text-sm transition-colors text-muted-foreground hover:text-primary flex-shrink-0 border-b-2 border-transparent"
          >
            <div className="flex items-center gap-2"><Plus className="size-4" /></div>
          </button>
        </div>"""

content = content.replace(tab_nav_find, tab_nav_replace)

# 4. Render Dynamic Tab Content
if "const activeDynamicTab = dynamicTabs.find" not in content:
    dynamic_content = """        {/* Dynamic Tab Content */}
        {(() => {
          const activeDynamicTab = dynamicTabs.find(t => t.id === activeTab);
          if (!activeDynamicTab) return null;
          return (
            <GrowthStrategyTab 
              key={activeDynamicTab.id}
              tab={activeDynamicTab}
              onUpdate={(updatedTab) => setDynamicTabs(dynamicTabs.map(t => t.id === updatedTab.id ? updatedTab : t))}
              onDelete={(id) => {
                setDynamicTabs(dynamicTabs.filter(t => t.id !== id));
                setActiveTab("tests");
              }}
            />
          );
        })()}"""
        
    content = content.replace(
        '{/* Tests Content */}',
        dynamic_content + '\n\n        {/* Tests Content */}'
    )

with open("src/routes/growth.tsx", "w") as f:
    f.write(content)
print("Updated growth.tsx")
