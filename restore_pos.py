import json
import os

log_file = "/home/bruno-abreu/.gemini/antigravity/brain/cf73655d-a474-4cfa-8faf-c3ecb16d9faf/.system_generated/logs/overview.txt"
target_file = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(target_file, "r") as f:
    content = f.read()

tool_calls_to_apply = []

with open(log_file, "r") as f:
    for line in f:
        if "PosStudies.tsx" in line and "PLANNER_RESPONSE" in line:
            try:
                data = json.loads(line)
                step = data.get("step_index", 99999)
                if step < 321:
                    for tc in data.get("tool_calls", []):
                        if tc["name"] in ["replace_file_content", "multi_replace_file_content"]:
                            args = tc["args"]
                            tf = args.get("TargetFile", "")
                            if isinstance(tf, str):
                                tf = tf.strip('"')
                            if tf == target_file:
                                tool_calls_to_apply.append((step, tc["name"], args))
            except Exception as e:
                pass

tool_calls_to_apply.sort(key=lambda x: x[0])

for step, name, args in tool_calls_to_apply:
    print(f"Applying step {step}: {args.get('Instruction')}")
    if name == "replace_file_content":
        target = args.get("TargetContent", "").strip('"').encode('utf-8').decode('unicode_escape')
        replacement = args.get("ReplacementContent", "").strip('"').encode('utf-8').decode('unicode_escape')
        # Handle the fact that overview.txt JSON strings might have literal \n or escaped \n
        
        # Let's use string replace
        if target in content:
            content = content.replace(target, replacement, 1)
        else:
            # Maybe the newlines are literal \n inside the string representation
            target_fix = target.replace('\\n', '\n')
            replacement_fix = replacement.replace('\\n', '\n')
            if target_fix in content:
                content = content.replace(target_fix, replacement_fix, 1)
            else:
                print(f"Failed to find target for step {step}")
            
    elif name == "multi_replace_file_content":
        chunks = args.get("ReplacementChunks", [])
        if isinstance(chunks, str):
            try:
                chunks = json.loads(chunks.strip('"').encode('utf-8').decode('unicode_escape'))
            except:
                try:
                    chunks = json.loads(chunks)
                except:
                    print(f"Failed to parse chunks for step {step}")
                    continue
        for chunk in chunks:
            target = chunk["TargetContent"]
            replacement = chunk["ReplacementContent"]
            if target in content:
                content = content.replace(target, replacement, 1)
            else:
                target_fix = target.replace('\\n', '\n')
                replacement_fix = replacement.replace('\\n', '\n')
                if target_fix in content:
                    content = content.replace(target_fix, replacement_fix, 1)
                else:
                    print(f"Failed to find target chunk for step {step}")

with open(target_file, "w") as f:
    f.write(content)
    
print("Restoration complete.")
