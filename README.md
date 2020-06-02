# parallel-blocks README

This is the README for your extension "parallel-blocks". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

-----------------------------------------------------------------------------------------------------------

Inspiration from the great http://codes.kary.us/comment/vscode/tree/master

FIXME
-----

- When region is right below colapsable block and the the addBlock command is triggered on the region start, it colapses the above block
```javascript

// addBlock on //#region colapses the for loop.
 for (let i = 0; i < arr.length; i++) {
    //#region
    // __1__
//     sum += arr[i];
    // __2__
//     sum += arr[i];
    // __3__
//     sum += arr[i];
    // __4__active
    //#endregion
    sum += arr[i];
    //#endblock
  }
```