# project --- Design Direction for the UI Agent

## Your role

Act as a senior product designer and frontend experience engineer. Your
task is to shape project into a distinctive, polished digital
product---not a generic university project, admin template, or
collection of CRUD screens.

project helps students discover campus events, understand what is
happening, and participate. It also gives organizers a focused workspace
to publish and manage events.

The design should make that purpose immediately clear.

## 1. The overall experience

Create an experience that feels:

-   **Purposeful:** Every section has a clear reason to exist.
-   **Distinctive:** The product has a recognizable visual character
    without relying on decorative effects.
-   **Editorial:** Event photography, titles, dates, and descriptions
    are presented with the care of a well-designed publication.
-   **Confident:** Layouts feel considered, balanced, and complete.
-   **Approachable:** Students should understand where to go and what to
    do without learning the interface.
-   **Professional:** Organizers should feel they are using a credible
    product, not a classroom prototype.

Aim for the quality and restraint of a well-crafted modern digital
product. Use strong composition, deliberate spacing, clear hierarchy,
and meaningful imagery. Do not imitate another product literally.

## 2. Design around the product's purpose

The central experience is event discovery.

A visitor should understand within a few seconds:

1.  What project is.
2.  What kinds of events they can discover.
3.  How to explore an event.
4.  How to participate or register.

Do not let the landing page become a generic marketing template. Its
content and layout must communicate campus events specifically.

Treat event information as the main visual content. Event titles,
posters, dates, locations, and categories should be easy to scan and
compare.

## 3. Landing page

Build a memorable first impression with a clear narrative.

### Hero

-   Communicate the product's purpose immediately.
-   Use a concise, meaningful headline rather than generic promotional
    wording.
-   Pair the message with a strong visual composition based on real
    event imagery.
-   Make the primary action obvious.
-   Keep supporting content short and useful.
-   Avoid filling the hero with floating decorations, excessive badges,
    or unrelated statistics.

The hero should feel composed and intentional. It should not look like a
prebuilt template with its text and image replaced.

### Content flow

Organize the page in a logical sequence:

1.  A clear introduction to project.
2.  A useful way to explore event categories.
3.  A focused selection of upcoming or featured events.
4.  A simple explanation of how participation works.
5.  A clear invitation to explore events or host one.
6.  A concise footer with useful navigation.

Each section must add new information. Avoid repeating the same message
in different layouts.

## 4. Event discovery

The event listing is a core product screen, not an afterthought.

-   Make the page title and purpose immediately clear.
-   Keep search and category filtering easy to find.
-   Make filters understandable and easy to reset.
-   Present events in a consistent, carefully aligned collection.
-   Give event posters enough space to communicate the character of each
    event.
-   Keep titles, dates, locations, and categories easy to scan.
-   Make the entire browsing experience feel calm, not crowded.

Event cards should have a clear information hierarchy. Do not place
every available field on the card. Show the information that helps a
student decide whether to open the event.

Use consistent image treatment and card proportions. Handle missing
posters gracefully without making the layout look broken.

## 5. Event details

The event details page should help a student make a decision.

Prioritize:

-   Event identity and poster.
-   Title and category.
-   Date and time.
-   Location.
-   Organizer information.
-   A readable description.
-   Registration availability and action.
-   Weather information for the event location.

Keep the registration action easy to locate without allowing it to
dominate the entire page.

Present weather as useful supporting information. It should feel
integrated into the event experience rather than like an unrelated API
demonstration.

Clearly distinguish available, already registered, and fully booked
states.

## 6. Student experience

The student dashboard should answer three questions quickly:

-   What have I registered for?
-   What is coming up next?
-   Where can I discover more events?

Avoid turning the dashboard into a wall of statistics. Use a small
number of meaningful summaries and give upcoming registrations the
strongest emphasis.

Make navigation predictable. A student should always understand where
they are and how to return to event discovery.

Empty states should guide the next action. For example, a student with
no registrations should be encouraged to explore events rather than
shown an empty table.

## 7. Organizer experience

The organizer workspace should prioritize managing events efficiently.

-   Make the organizer's next action obvious.
-   Present event management as a clear, readable workspace.
-   Keep event creation easy to access.
-   Make event status and registration counts easy to understand.
-   Use tables or structured lists when they improve comparison and
    management.
-   Keep destructive actions visually distinct and require confirmation.
-   Avoid unnecessary dashboard charts or decorative statistics.

The organizer interface should feel like a practical tool. It should not
compete visually with the student-facing discovery experience.

## 8. Create and edit event forms

Forms should feel straightforward and reassuring.

-   Group related fields logically.
-   Use clear labels and helpful descriptions where needed.
-   Make required fields obvious.
-   Keep validation feedback close to the relevant field.
-   Preserve entered information when validation fails.
-   Make the poster upload area understandable before interaction.
-   Show an image preview after selection.
-   Provide clear upload, replacement, removal, and failure states.
-   Make the final save action easy to identify.

Do not make a simple event form look like a complicated multi-step
enterprise workflow.

## 9. Authentication

Keep sign-in and registration focused.

-   Explain the purpose of the page.
-   Avoid unnecessary fields and distractions.
-   Make errors understandable and actionable.
-   Show password visibility controls where appropriate.
-   Make the transition between sign-in and registration obvious.
-   Keep the experience consistent with the rest of project.

Do not allow the visual design to imply that users can grant themselves
privileged organizer access unless the application actually supports a
secure authorization flow.

## 10. Visual hierarchy and composition

Use these principles throughout the product:

-   Establish one clear focal point per screen.
-   Use spacing to separate content groups instead of adding unnecessary
    containers.
-   Align elements consistently.
-   Keep related information visually connected.
-   Use contrast and scale to communicate importance.
-   Avoid excessive borders, shadows, pills, badges, and nested cards.
-   Do not put every section inside a separate panel.
-   Avoid layouts where every element has equal visual weight.
-   Use icons only when they improve recognition or understanding.
-   Keep decorative elements subordinate to actual content.

A screen should feel designed as a whole, not assembled from unrelated
components.

## 11. Imagery and content

Event imagery is a major part of project's identity.

-   Prefer authentic, relevant event photography.
-   Use imagery that represents workshops, talks, competitions, student
    activities, and campus gatherings.
-   Maintain consistent cropping and image proportions.
-   Avoid unrelated stock imagery and generic abstract illustrations.
-   Do not use images merely to fill empty space.
-   Make image loading and missing-image states intentional.

Use realistic content during development. Event titles, descriptions,
dates, and locations should feel like actual university events. Avoid
repeated placeholder text such as "Lorem ipsum" or identical sample
cards.

## 12. Interaction quality

Every interaction should communicate its result.

Design complete states for:

-   Initial loading.
-   Search in progress.
-   No search results.
-   Empty collections.
-   Form validation.
-   Successful submission.
-   Failed submission.
-   Image upload progress.
-   Image upload failure.
-   Registration success.
-   Duplicate registration.
-   Event capacity reached.
-   Weather unavailable.
-   Unauthorized access.

Use subtle transitions to clarify changes in state. Avoid animation that
delays the user's task or exists only for decoration.

Buttons, links, filters, dropdowns, dialogs, and navigation items must
perform their stated actions. Never leave a control looking functional
when it is not connected.

## 13. Responsive behavior

Do not treat mobile as a compressed desktop layout.

Reconsider the composition for smaller screens:

-   Preserve the most important content.
-   Keep navigation easy to use.
-   Make search and filters practical on touch devices.
-   Keep event cards readable.
-   Stack event details in a sensible order.
-   Ensure forms are comfortable to complete.
-   Keep important actions accessible.
-   Prevent horizontal overflow.
-   Use appropriate touch target sizes.

Check the experience at narrow mobile, tablet, laptop, and wide desktop
sizes.

## 14. Consistency across the product

Create a coherent design system through reusable patterns.

Maintain consistency in:

-   Page structure.
-   Navigation behavior.
-   Content spacing.
-   Card anatomy.
-   Form controls.
-   Buttons and actions.
-   Dialogs and notifications.
-   Loading and empty states.
-   Responsive behavior.

Student-facing and organizer-facing screens may have different layouts,
but they must clearly belong to the same product.

Reuse components where the interaction and purpose are genuinely shared.
Do not force unrelated screens into one generic component.

## 15. Implementation constraints

Before changing the project:

1.  Inspect the existing repository and understand its framework and
    structure.
2.  Identify existing routes, components, authentication, API calls, and
    data models.
3.  Preserve working functionality.
4.  Reuse existing dependencies and conventions where practical.
5.  Avoid replacing backend logic just to simplify the UI.
6.  Keep mock data isolated and never present it as real production
    data.
7.  Ensure the interface reflects actual loading, success, and error
    states from the application.

Build the design as a consistent product, not as disconnected page
mockups.

## 16. Quality review before completion

Review every screen as both a designer and a user.

Ask:

-   Is the purpose of this screen immediately clear?
-   Is the most important action obvious?
-   Can the user scan the content quickly?
-   Is anything visually unnecessary?
-   Does the layout feel balanced?
-   Are event images presented consistently?
-   Are all states designed, including empty and error states?
-   Does the screen work at mobile and desktop sizes?
-   Do all visible controls actually work?
-   Does the experience feel like one coherent product?

Fix inconsistent spacing, awkward alignment, overcrowded sections,
generic placeholder content, weak hierarchy, and unfinished states.

## Final direction

Make project memorable through **clarity, composition, meaningful
imagery, and excellent interaction design**.

Do not try to make it stand out by adding more effects or more UI
elements. Make it stand out because every part feels intentional,
useful, and exceptionally well executed.

The result should be a product that a student would genuinely want to
use and an organizer would confidently use to manage campus events.
