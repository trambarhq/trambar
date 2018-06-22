Trambar User Guide
------------------

* [Start screen](#start-screen)
  * [Web browser](#web-browser)
  * [Mobile app](#mobile-app)
* [News](#news)
* [Notifications](#notifications)
* [Bookmarks](#bookmarks)
* [People](#people)

## Start screen

### Web browser

### Mobile app

## News

In the **News** page, you'll find the currently selected project's news feed. Up
to 100 stories are shown.

![News page](img/client-news-page.png)

* [Story selection](#story-selection)
* [Story editor](#story-editor)
* [Story view](#story-view)
* [Story options](#story-options)
* [Story types](#story-types)
* [Reaction types](#reaction-types)

### Story selection

The news feed is individualized. If you visit the site frequently, you'll end up
seeing every story. If you visit the site only on occasions and the number of
unread stories exceeds 100, you would only see the top 100. Stories are ranked
using on a set of heuristic rules:

* Certain types of stories (merge, wiki, issue, survey) have high base scores
* Stories receive points for each like, comment, and vote
* Recent stories are given an extra boost
* A "diversity bonus" is given to stories by users authoring only a few
* Stories by users with a certain role can have a higher score

Suppose you on a team developing a software for an external client. You've
invited the client representative to your trambar so she can see the project is
moving forward. At the end of each week, she fires up Trambar on her phone and
spends a few minutes flipping through the feed. She'll see what're basically
the week's highlights. The lead programmer, on the other hand, keeps Trambar
open in a second monitor. When something occurs, he sees it immediately. The
scoring system describe above does not come into play at all.

In this scenario, the client representative would have a guest account. She
would not see stories meant only for internal use. The lead programmer would
likely have a moderator account, with the power to hide other users' stories
from guests. He might choose to suppress a post that triggered a long discussion
over coding techniques, for instance.

### Story editor

Project members are allowed to post stories. The story editor sits at the top of
the News page. If you have scrolled down, you can return to the top by clicking
the **News** button.

* [Editor Interface](#editor-interface)
* [Auto saving](#auto-saving)
* [Markdown](#markdown)
* [Task list and survey](#task-list-and-survey)
* [Tagging](#tagging)
* [Emojis](#emojis)
* [Attachments](#attachments)
* [Embedded media](#embedded-media)
* [Coauthors](#coauthors)

#### Editor interface

The story editor adjust its UI to fit the space available. On a wide screen,
its three parts appear side-by-side:

![Story editor - 3 columns](img/client-story-editor-col3.png)

On the left is the text editor. In the center is the text-preview/media pane.
On the right are story options that you can toggle.

When the screen is a bit more narrow, the stories options are relocated to
pop-up menus:

![Story editor - 2 columns](img/client-story-editor-col2.png)

On a mobile device (or if you've resized a browser window to a narrow strip),
the two remaining panels are stacked on top of each other:

![Story editor - 1 column](img/client-story-editor-col1.png)

#### Auto-saving

Contents entered into the story editor are automatically saved to the remote
server. This allows you to start a post on a mobile phone (perhaps making use
of not-so-perfect voice recognition) and finish editing it on a computer once
you've returned to your desk.

#### Markdown

The text editor accepts either plain text or [Markdown](https://guides.github.com/features/mastering-markdown/).
When you employ Markdown formatting, Trambar will automatically switch to
Markdown mode and activate the text preview pane:

![Story editor - Markdown](img/client-story-editor-markdown.png)

#### Task list and survey

The editor also permits the creation of task lists and surveys:

![Story editor - task list](img/client-story-editor-task-list.png)

When Trambar sees a list, it assumes you want to create a task list. If you
want to create a survey instead, you would need to click the Survey button:

![Story editor - survey](img/client-story-editor-survey.png)

The sequence `*[]` is automatically expanded to `* [ ]`. This eases the
initiation of list creation on a touch device.

#### Tagging

#### Emojis

Trambar supports the displaying of emojis on desktop web-browsers. Currently
there's no mechanism for inputing them, however.

![Story editor - emojis](img/client-story-editor-emojis.png)

#### Attachments

#### Embedded media

Media attached to a story can be embedded into Markdown text. The tag
`![image-1]` or `![picture-1]` refers to the first image attached. `![video-2]`
meanwhile refers to the second video attached. A tiny thumbnail appears in
place of the tag:

![Story editor - embedded images](img/client-story-editor-markdown-images.png)

When the thumbnail is clicked, a pop-up windows appears showing the full image
(or video). Audio can also be embedded.

Task lists and surveys can use Markdown so media can be embedded into them as
well. Suppose you want your team to choose between four images. You would type
in the following:

```
Which picture do you like best:

* [ ] ![image-1]
* [ ] ![image-2]
* [ ] ![image-3]
* [ ] ![image-4]
```

The result would look like this:

![Story editor - embedded images](img/client-story-editor-survey-images.png)

#### Coauthors

### Story options

* [Bookmark story](#bookmark-story)
* [Send bookmark to others](#send-bookmark-to-others)
* [Add issue to tracker](#add-issue-to-tracker)
* [Hide from guests](#hide-from-guests)
* [Bump story](#bump-story)
* [Remove story](#remove-story)

#### Bookmark story

#### Send bookmark to others

#### Add issue to tracker

#### Hide from guests

#### Bump story

#### Remove story

### Story types

* [Post](#post)
* [Task list](#task-list)
* [Survey](#survey)
* [Git events](#git-events)
  * [Push](#push)
  * [Merge](#merge)
  * [Branch](#branch)
  * [Issue](#issue)
  * [Merge request](#merge-request)
  * [Milestone](#milestone)
  * [Membership](#membership)
  * [Repository](#repository)
  * [Wiki](#wiki)

#### Post

#### Task list

#### Survey

#### Git events

##### Push

##### Merge

##### Branch

##### Issue

##### Merge request

##### Milestone

##### Membership

##### Repository

##### Wiki

### Reaction types

* [Like](#like)
* [Comment](#comment)
* [Vote](#vote)
* [Task completion](#task-completion)
* [Git reactions](#git-reactions)
  * [Note](#note)
  * [Issue assigment](#issue-assigment)
  * [Issue tracking](#issue-tracking)

#### Like

#### Comment

#### Vote

#### Task completion

#### Git reactions

##### Note

##### Issue assigment

##### Issue tracking

### Story selection

## Notifications

## Bookmarks

## People

* [User view](#user-view)
* [Recent activities](#recent-activities)
* [Activity chart](#activity-chart)
* [Actions](#actions)
  * [Contact by email](#contact-by-email)
  * [Contact by phone](#contact-by-phone)
  * [Contact by iChat](#contact-by-ichat)
  * [Contact by Skype](#contact-by-skype)

### User view

#### Recent activities

#### Activity chart

#### Actions

##### Contact by email

##### Contact by phone

##### Contact by iChat

##### Contact by Skype
