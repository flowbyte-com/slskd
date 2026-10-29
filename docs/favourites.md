# Favourite Users

slskd can keep a list of favourite Soulseek users so that they are easy to find
and browse.  Favourites can be managed from the **Favourites** screen, which is
available from the main navigation.

## Adding and removing favourites

A user can be favourited from several places:

- From **search results**.  Each search result displays a star next to the
  username; click it to add or remove the user.
- From the **Browse** screen.  The star next to the username in the results
  header adds or removes the user that is being browsed.
- From the **Users** screen.  The star below the user information adds or
  removes the user that is being displayed.
- From the **Favourites** screen.  Usernames can be added by typing them into
  the input at the top of the screen, and removed with the **Remove** action.

A filled star indicates that the user is a favourite; an outlined star
indicates that they are not.  Hovering over the star displays a description of
the action that will be taken, and the star is exposed to screen readers as a
toggle button.

## Browsing favourites

Clicking a username on the Favourites screen, or using the **Browse** action,
opens the Browse screen and immediately requests that user's shared files.

## Storage and limitations

> **Favourites are stored in your web browser, not on the server.**

Favourites are saved in the browser's local storage, under the
`slskd-favourites` key.  This has a few consequences:

- Favourites are **local to the browser** in which they were created.  They are
  not synchronized between browsers, devices, or user accounts, and they are
  not visible to the slskd server.
- Favourites survive a browser restart, but they are lost if the browser's
  local storage is cleared, if the site data for the slskd origin is removed,
  or if the browser is used in a private/incognito window that is closed.
- Favourites are not included in any slskd backup or configuration file.

Usernames are compared without regard to case, so favouriting `Alice` and then
favouriting `alice` will not create a duplicate entry; the casing that was
used when the user was first added is the casing that is displayed.  Empty
usernames, and usernames containing control characters, are rejected.

## Presence information

The Favourites screen optionally displays the presence of each favourite
(*Online*, *Away*, or *Offline*).  This information is retrieved from the
server when the screen is loaded, and can be refreshed with the **Refresh
Status** button.  It is never polled automatically; one request is made per
favourite, per refresh.
