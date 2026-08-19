import re

file_path = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add formatCourseDuration helper
helper_code = """
export const formatCourseDuration = (hours: number | null | undefined) => {
  if (!hours) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

"""
if "export const formatCourseDuration" not in content:
    content = content.replace("export function PosStudies() {", helper_code + "export function PosStudies() {")

# 2. Replace the form input
old_input = """              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Carga Horária Estimada (h)</label>
                <input 
                  type="number" min="1" required value={newCourse.total_hours || ''} onChange={e => setNewCourse({...newCourse, total_hours: Number(e.target.value)})}
                  className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ex: 40"
                />
              </div>"""

new_input = """              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-2 block">Duração (Horas e Minutos)</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="number" min="0" value={Math.floor(newCourse.total_hours || 0) || ''} onChange={e => {
                        const h = Number(e.target.value);
                        const currentM = Math.round(((newCourse.total_hours || 0) - Math.floor(newCourse.total_hours || 0)) * 60);
                        setNewCourse({...newCourse, total_hours: h + (currentM / 60)});
                      }}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors pr-10"
                      placeholder="Horas"
                    />
                    <span className="absolute right-4 top-3 text-xs text-[#71717A] font-bold">h</span>
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="number" min="0" max="59" value={Math.round(((newCourse.total_hours || 0) - Math.floor(newCourse.total_hours || 0)) * 60) || ''} onChange={e => {
                        const m = Number(e.target.value);
                        const currentH = Math.floor(newCourse.total_hours || 0);
                        setNewCourse({...newCourse, total_hours: currentH + (m / 60)});
                      }}
                      className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors pr-10"
                      placeholder="Minutos"
                    />
                    <span className="absolute right-4 top-3 text-xs text-[#71717A] font-bold">m</span>
                  </div>
                </div>
              </div>"""

content = content.replace(old_input, new_input)

# 3. Replace {var}h with {formatCourseDuration(var)} in text nodes safely
# There are multiple patterns:
# {totalHours}h
# {Math.round(totalHours)}h
# {Math.round(totalRegisteredHours)}h
# {c.completed_hours}h / {c.total_hours}h
# {course.completed_hours}h / {course.total_hours}h
# {selectedCourse.total_hours}h totais
# {selectedCourse.completed_hours}h
# {selectedCourse.total_hours ? selectedCourse.total_hours - selectedCourse.completed_hours : 0}h estimadas
# {tabStats.tabHours}h Estudadas

replacements = [
    (r'\{totalHours\}h', r'{formatCourseDuration(totalHours)}'),
    (r'\{Math\.round\(totalHours\)\}h', r'{formatCourseDuration(totalHours)}'),
    (r'\{Math\.round\(totalRegisteredHours\)\}h', r'{formatCourseDuration(totalRegisteredHours)}'),
    (r'\{c\.completed_hours\}h \/ \{c\.total_hours\}h', r'{formatCourseDuration(c.completed_hours)} / {formatCourseDuration(c.total_hours)}'),
    (r'\{course\.completed_hours\}h \/ \{course\.total_hours\}h', r'{formatCourseDuration(course.completed_hours)} / {formatCourseDuration(course.total_hours)}'),
    (r'\{totalStudyHours\}h', r'{formatCourseDuration(totalStudyHours)}'),
    (r'\{selectedCourse\.total_hours\}h totais', r'{formatCourseDuration(selectedCourse.total_hours)} totais'),
    (r'\{selectedCourse\.completed_hours\}h', r'{formatCourseDuration(selectedCourse.completed_hours)}'),
    (r'\{selectedCourse\.total_hours \? selectedCourse\.total_hours - selectedCourse\.completed_hours : 0\}h estimadas', r'{formatCourseDuration(selectedCourse.total_hours ? selectedCourse.total_hours - selectedCourse.completed_hours : 0)} estimadas'),
    (r'\{tabStats\.tabHours\}h Estudadas', r'{formatCourseDuration(tabStats.tabHours)} Estudadas'),
]

for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
