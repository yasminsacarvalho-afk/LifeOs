import re

file_path = "/home/bruno-abreu/RapiHub/voyage-flow-dashboard/src/components/pos/PosStudies.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will replace:
#                                                            )})}
#                                                          </div>
#                                                        );
#                                                     })()}
# with:
#                                                            )})}
#                                                          </div>
#                                                        )}
#                                                        </div>
#                                                        );
#                                                     })()}

bad_block = """                                                           )})}
                                                         </div>
                                                       );
                                                    })()}"""
good_block = """                                                           )})}
                                                         </div>
                                                       )}
                                                         </div>
                                                       );
                                                    })()}"""

content = content.replace(bad_block, good_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Syntax fixed")
