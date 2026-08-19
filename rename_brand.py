import os

files_to_check = [
    "src/components/ui/PdfEditor.tsx",
    "src/components/pos/PublicStudentView.tsx",
    "src/components/pos/PosStudies.tsx"
]

for filepath in files_to_check:
    full_path = os.path.join("/home/bruno-abreu/RapiHub/voyage-flow-dashboard", filepath)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace 1
        content = content.replace("Academia Operacional", "O Polimata")
        
        # Replace 2
        content = content.replace("Ecossistema de Alta Performance", "Foco, Disciplina e Constancia")
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
print("Done")
