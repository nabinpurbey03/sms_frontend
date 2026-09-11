import sys
import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace :root
old_root = '''  :root {
    --background: 228 13% 92%; /* rgb(233, 234, 238) / #E9EAEE */
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Default Primary: Emerald Pulse / Spotify Vibrant Green #1ED760 */
    --primary: 141 76% 48%; /* #1ED760 */
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 141 76% 48%;

    --radius: 0.625rem;
  }'''

new_root = '''  :root {
    --background: 228 13% 92%; /* rgb(233, 234, 238) / #E9EAEE */
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Ocean Primary: #03045E */
    --primary: 239.3 93.8% 19.0%; 
    --primary-foreground: 210 40% 98%;

    /* Ocean Secondary: #0077B6 */
    --secondary: 200.8 100.0% 35.7%;
    --secondary-foreground: 210 40% 98%;

    /* Ocean Muted (Fourth): #90E0EF */
    --muted: 189.5 74.8% 75.1%;
    --muted-foreground: 239.3 93.8% 19.0%;

    /* Ocean Accent (Fifth): #CAF0F8 */
    --accent: 190.4 76.7% 88.2%;
    --accent-foreground: 239.3 93.8% 19.0%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    
    /* Ocean Ring (Tertiary): #00B4D8 */
    --ring: 190.0 100.0% 42.4%;

    --radius: 0.625rem;
  }'''

content = content.replace(old_root, new_root)

# Replace .dark
old_dark = '''  .dark {
    --background: 224 71% 4%; /* #030712 */
    --foreground: 210 40% 98%;

    --card: 222 47% 10.5%; /* #0F172A */
    --card-foreground: 210 40% 98%;

    --popover: 222 47% 12%;
    --popover-foreground: 210 40% 98%;

    /* Default Primary Dark: Spotify Vibrant Green */
    --primary: 141 76% 48%; /* #1ED760 */
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217 33% 16%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217 33% 16%;
    --muted-foreground: 215 20% 68%;

    --accent: 217 33% 16%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;

    --border: 217 30% 19%;
    --input: 217 30% 19%;
    --ring: 141 76% 48%;
  }'''

new_dark = '''  .dark {
    --background: 224 71% 4%; /* #030712 */
    --foreground: 210 40% 98%;

    --card: 222 47% 10.5%; /* #0F172A */
    --card-foreground: 210 40% 98%;

    --popover: 222 47% 12%;
    --popover-foreground: 210 40% 98%;

    /* Ocean Primary (Dark mode uses Tertiary Cyan for visibility): #00B4D8 */
    --primary: 190.0 100.0% 42.4%; 
    --primary-foreground: 239.3 93.8% 19.0%; /* Dark Navy text */

    /* Ocean Secondary: #0077B6 */
    --secondary: 200.8 100.0% 35.7%;
    --secondary-foreground: 210 40% 98%;

    /* Dark tinted muted/accent backgrounds */
    --muted: 190 30% 15%;
    --muted-foreground: 190 20% 75%;

    --accent: 190 30% 15%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;

    --border: 190 30% 19%;
    --input: 190 30% 19%;
    
    /* Ocean Ring: #00B4D8 */
    --ring: 190.0 100.0% 42.4%;
  }'''

content = content.replace(old_dark, new_dark)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
