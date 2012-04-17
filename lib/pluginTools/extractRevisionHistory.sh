# Given a TiddlyWiki Plugin source file in default abego TiddlyWiki Plugin 
# source format the tool returns the revision history of the plugin, i.e.
# the text between
#     !Revision history
# and 
#     !Source Code
#
# The headline is not included.
awk ' /!Source Code/ {output=0} output == 1 {print} /!Revision history/ {output=1} '
