import json, re

def find_last_view_file(log_path, filename):
    content = ""
    with open(log_path, "r") as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if "TOOL_RESPONSE" in line and "view_file" in line and filename in line:
                try:
                    data = json.loads(line)
                    # output is in data["output"]
                    if "The following code has been modified to include a line number" in data.get("output", ""):
                        content = data["output"]
                except:
                    pass
    return content

log1 = "/home/bruno-abreu/.gemini/antigravity/brain/cf73655d-a474-4cfa-8faf-c3ecb16d9faf/.system_generated/logs/overview.txt"
log2 = "/home/bruno-abreu/.gemini/antigravity/brain/f1903ba1-7d3e-4b14-9d9f-5609b4d291aa/.system_generated/logs/overview.txt"

print("Log 1 PosStudies:", len(find_last_view_file(log1, "PosStudies.tsx")))
print("Log 2 PosStudies:", len(find_last_view_file(log2, "PosStudies.tsx")))
print("Log 1 RichText:", len(find_last_view_file(log1, "RichTextEditor.tsx")))
print("Log 2 RichText:", len(find_last_view_file(log2, "RichTextEditor.tsx")))
