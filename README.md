# jhtml

Create a html website with the use of JSON instead of the XML format.

*Disclaimer: This project is made for fun and is not intended to be used. Syntax is subject to change*

## How to use
Start by creating a json file and with an empty array. This is the equlivant of a empty html file with only the html tag.

Each tag is represented by a two curly brackets. In its simplest form can a tag represented by a key-value pair where the key is the tag and the value is the either the raw content or a list of children.
Alternativly can a "tag" key-value pair be giving to set the tag and a "children" key-value pair to give the children. This tag must have an array of tags as the value. If the tag does not need children but raw content then the "raw" key-value pair can be used.

Giving a "raw" key-value pair will set the raw content in the tag.
Using any other key in a tag will create an attribute.
```json
[
	{
		"tag": "head",
		"children": [
			{
				"title": "This is the title."
			},
			{
				"meta": "utf-8"
			}
		]
	},
	{
		"tag": "body",
		"children": [
			{
				"tag": "h1",
				"raw": "Hello world!"
			}
		]
	}
]
```
See the examples folder for up-to-date examples

## Todo:
- Auto stylesheet creation
- File-based router
- Better error system
- Reactive components/pages
- For loops
- Watch function should work for directory instead of the main file
- Output should be in a build folder by default
- Dev web server with auto reload
- Maybe change components to be webcomponents