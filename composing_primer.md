# Fōrmulæ — Composing primer

This document is a primer on using Fōrmulæ expressions as a composing interchange format. It is written for AI models.

---

## Instructions

- Every message you receive will be a Fōrmulæ XML expression.
- Every response you produce must be a **single Fōrmulæ XML expression** — the bare XML only, with no surrounding prose, no introduction, and no markdown code fences.

---

## Overview

Fōrmulæ expressions can be exchanged as XML between a human and an AI model (or between AI models) to compose rich, structured visual content. A human creates an expression in the Fōrmulæ interactive notebook — a mathematical formula, a paragraph, a chemical compound, a diagram, etc. — and sends its XML representation as a message. The AI responds with its own XML expression tree, which Fōrmulæ renders back in the notebook.

This primer explains the XML format for those exchanges, and provides a reference of all expression types meaningful for composing.

The XML structure is that of a single expression tree: one root `<expression>` element, optionally containing nested `<expression>` elements, forming a tree of arbitrary depth.

---

## The `<expression>` element

Every node in the expression tree is represented by an XML element named `expression`. Every such element must have a `tag` attribute. Beyond `tag`, an element may have:

- Additional XML attributes carrying scalar data specific to its expression type (called **serialized attributes**)
- Child `<expression>` elements carrying its **subexpressions**

General shape:

```xml
<expression tag="Some.Tag" [Attr1="value1"] [Attr2="value2"]>
    [<expression .../>]
    [<expression .../>]
</expression>
```

---

## Tag names

The `tag` attribute identifies the expression type. Tags are dot-separated, PascalCase strings that form a hierarchical namespace. Examples:

- `Math.Number`
- `Math.Arithmetic.Addition`
- `String.Text`
- `Typesetting.Paragraph`
- `Logic.Conjunction`
- `List.List`

The tag uniquely determines: (a) which serialized attributes are valid, (b) how many subexpressions are expected and what each one means.

---

## Serialized attributes

Some expression types store scalar data (a number value, a string, a name, etc.) directly on the `<expression>` element as XML attributes. These are called **serialized attributes**.

- The names of serialized attributes (e.g. `Value`, `Name`, `Description`) are defined per tag.
- Their values are always strings in the XML, even when they represent numbers or booleans.
- Not all expression types have serialized attributes. Expressions whose entire data is expressed through subexpressions typically have none.

Common serialized attribute names and what they usually hold:

| Attribute name | Typical content |
|---|---|
| `Value` | The scalar value of a leaf (a number, a string, etc.) |
| `Name` | An identifier or user-chosen name |
| `Description` | A human-readable label |
| `Type` | An enumerated type discriminator |

---

## Subexpressions

Subexpressions are the children of an expression in the tree. They are encoded as direct child `<expression>` elements, **in order**. Their position (first child, second child, etc.) is significant — each position has a defined role determined by the parent's tag.

- An expression with zero subexpressions is a **leaf**. It has no child elements.
- An expression with one or more subexpressions is **compound**. Its children appear in order inside the element.
- Some tags accept a fixed number of subexpressions; others accept a variable number (including unlimited).

---

## Rules summary

- Every node is an `<expression>` element.
- Every `<expression>` element must have a `tag` attribute.
- The `tag` value determines what other attributes are valid and how many child elements are expected.
- Serialized attributes (other than `tag`) hold scalar data and are always strings.
- Child `<expression>` elements are the subexpressions, in positional order.
- A leaf expression has no child elements. It stores all its data in attributes.
- A compound expression stores its structure in child elements. It may also have serialized attributes.
- The specific attributes and subexpression roles for each tag are defined in the expression reference (see below).

---

## Examples

The following examples use four expression types:

| Tag | Kind | Serialized attributes | Subexpressions |
|---|---|---|---|
| `Math.Number` | Leaf | `Value`: textual form of the number | Zero |
| `Math.Arithmetic.Addition` | Compound | None | Two or more (the addends) |
| `String.Text` | Leaf | `Value`: the text content | Zero |
| `Typesetting.Paragraph` | Compound | None | One or more (inline elements displayed in sequence) |

### A number

The number 5:

```xml
<expression tag="Math.Number" Value="5"/>
```

The number 3.14:

```xml
<expression tag="Math.Number" Value="3.14"/>
```

### A text string

The text "Hello":

```xml
<expression tag="String.Text" Value="Hello"/>
```

### Arithmetic addition

The sum 2 + 3. `Math.Arithmetic.Addition` takes its addends as subexpressions in order. It has no serialized attributes.

```xml
<expression tag="Math.Arithmetic.Addition">
    <expression tag="Math.Number" Value="2"/>
    <expression tag="Math.Number" Value="3"/>
</expression>
```

A three-term sum 2 + 3 + 4 (addition accepts more than two addends):

```xml
<expression tag="Math.Arithmetic.Addition">
    <expression tag="Math.Number" Value="2"/>
    <expression tag="Math.Number" Value="3"/>
    <expression tag="Math.Number" Value="4"/>
</expression>
```

### A paragraph

`Typesetting.Paragraph` lays out its subexpressions inline, left to right. Each subexpression is a piece of content (text, a number, a formula, etc.). There are no serialized attributes.

The phrase "The result of 2 + 3 is 5" expressed as a paragraph containing text and math:

```xml
<expression tag="Typesetting.Paragraph">
    <expression tag="String.Text" Value="The result of"/>
    <expression tag="Math.Arithmetic.Addition">
        <expression tag="Math.Number" Value="2"/>
        <expression tag="Math.Number" Value="3"/>
    </expression>
    <expression tag="String.Text" Value="is"/>
    <expression tag="Math.Number" Value="5"/>
</expression>
```

Note that the `Math.Arithmetic.Addition` expression is nested inside the paragraph as one of its subexpressions, and it in turn contains two `Math.Number` leaf expressions as its own subexpressions.

---

## Conversational model

Fōrmulæ operates in three modes:

- **Compute**: the user builds an expression and submits it to the reduction engine for evaluation.
- **Compose**: expressions are assembled into a visual document for display.
- **Converse**: expressions are exchanged between the user and an AI model.

### How expressions are routed

When the user submits an expression in the Fōrmulæ front-end, the routing depends on the expression's root tag:

- If the root is **`Typesetting.Paragraph`** or **`Typesetting.MultiParagraph`** → the expression is sent to the AI model as a prompt.
- Otherwise → the expression is passed to the reduction engine for evaluation.

The paragraph expression *is* the prompt. No additional envelope is needed.

### Human prompt structure

A prompt is a `Typesetting.Paragraph` (for short, single-section prompts) or a `Typesetting.MultiParagraph` (for longer, multi-section prompts). Any expression type may appear as a subexpression of the paragraph, not just text. This enables multimodal prompts — for example, embedding a `Graphics.RasterGraphics` expression to include an image, or embedding a mathematical formula, a table, or a computed result.

### AI response structure

The AI should reply with a **single root Fōrmulæ expression**. The response does not need to be a typesetting expression. If the most appropriate answer is a table, reply with a `List.Table`; if it is a formula, reply with the formula expression; if it is a formatted document, reply with a `Typesetting.MultiParagraph`. Choose whichever expression type best represents the answer.

---

## Conversational examples

### Example 1 — Water molecule

The user asks the AI to provide the expression for a water molecule. The human prompt is a short `Typesetting.Paragraph`, and the AI replies with a `Chemistry.HeteronuclearCompound`:

**Human prompt:**

```xml
<expression tag="Typesetting.Paragraph">
    <expression tag="String.Text" Value="Show me the expression for a water molecule."/>
</expression>
```

**AI response:**

```xml
<expression tag="Chemistry.HeteronuclearCompound">
    <expression tag="Chemistry.HomonuclearCompound">
        <expression tag="Chemistry.Element.Hydrogen"/>
        <expression tag="Math.Number" Value="2"/>
    </expression>
    <expression tag="Chemistry.Element.Oxygen"/>
</expression>
```

### Example 2 — Image identification

The user embeds an image inside a `Typesetting.MultiParagraph` prompt. The AI identifies the image and responds with a formatted `Typesetting.MultiParagraph` containing bold text and a bulleted list.

**Human prompt:**

```xml
<expression tag="Typesetting.MultiParagraph">
    <expression tag="String.Text" Value="Identify the following image:"/>
    <expression tag="Typesetting.Centering">
        <expression tag="Graphics.RasterGraphics" Value="..." Format="image/png"/>
    </expression>
</expression>
```

**AI response:**

```xml
<expression tag="Typesetting.MultiParagraph">
    <expression tag="Typesetting.Paragraph">
        <expression tag="String.Text" Value="This image depicts"/>
        <expression tag="Typesetting.BoldChunk">
            <expression tag="String.Text" Value="Clarus the Dogcow,"/>
        </expression>
        <expression tag="String.Text" Value="a mascot character created by graphic designer Susan Kare for Apple's original Macintosh operating system."/>
    </expression>
    <expression tag="Typesetting.BulletedList">
        <expression tag="Typesetting.Paragraph">
            <expression tag="Typesetting.BoldChunk">
                <expression tag="String.Text" Value="Origin:"/>
            </expression>
            <expression tag="String.Text" Value="Originally part of the Cairo font set designed to look part dog and part cow."/>
        </expression>
        <expression tag="Typesetting.Paragraph">
            <expression tag="Typesetting.BoldChunk">
                <expression tag="String.Text" Value="Name:"/>
            </expression>
            <expression tag="String.Text" Value="The name &quot;Clarus&quot; was given later; &quot;Dogcow&quot; is a portmanteau of dog and cow."/>
        </expression>
    </expression>
</expression>
```

Note that the `Graphics.RasterGraphics` expression carries the image as base64-encoded PNG data in its `Value` attribute (abbreviated as `"..."` here). Any expression can appear as an inline item inside a paragraph, enabling multimodal prompts.

### Example 3 — Image generation and table

The user sends a text-only `Typesetting.MultiParagraph` asking for a seasonal table with generated images. The AI responds with a `List.Table` — not a typesetting expression. This illustrates that the AI response may be any expression type.

**Human prompt:**

```xml
<expression tag="Typesetting.MultiParagraph">
    <expression tag="Typesetting.Paragraph">
        <expression tag="String.Text" Value="Imagine a scene of a country cottage. In the background there is a beautiful landscape."/>
    </expression>
    <expression tag="Typesetting.Paragraph">
        <expression tag="String.Text" Value="Create a table that shows, for each of the seasons of the year, the name of the season and an image depicting how the scene would look in that season. Each image must be 166 × 92 pixels in size."/>
    </expression>
</expression>
```

**AI response:**

```xml
<expression tag="List.Table">
    <expression tag="List.List">
        <expression tag="List.List">
            <expression tag="Visualization.Bold" Value="True" Set="True">
                <expression tag="String.Text" Value="Season"/>
            </expression>
            <expression tag="Visualization.Bold" Value="True" Set="True">
                <expression tag="String.Text" Value="Image"/>
            </expression>
        </expression>
        <expression tag="List.List">
            <expression tag="String.Text" Value="Spring"/>
            <expression tag="Graphics.RasterGraphics" Value="..." Format="image/png"/>
        </expression>
        <expression tag="List.List">
            <expression tag="String.Text" Value="Summer"/>
            <expression tag="Graphics.RasterGraphics" Value="..." Format="image/png"/>
        </expression>
        <expression tag="List.List">
            <expression tag="String.Text" Value="Autumn"/>
            <expression tag="Graphics.RasterGraphics" Value="..." Format="image/png"/>
        </expression>
        <expression tag="List.List">
            <expression tag="String.Text" Value="Winter"/>
            <expression tag="Graphics.RasterGraphics" Value="..." Format="image/png"/>
        </expression>
    </expression>
</expression>
```

The `List.Table` holds a single `List.List` subexpression (the matrix), which itself contains one `List.List` per row. The first row is the header (wrapped in `Visualization.Bold`); subsequent rows are data rows. The images are AI-generated and encoded as base64 PNG in their `Value` attributes.

---

## Expression reference

The sections below document every expression type available for composing in Fōrmulæ: its tag, a description of its semantics, the number of subexpressions it accepts, the role of each subexpression, and the names and meanings of its serialized attributes.

---

### Arithmetic — Basic operations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Number` | A non-negative, integer or decimal number | Zero | | "Value": It contains the textual form of the number, in latin characters. It uses a dot as decimal separator, no group separator. If the number is an integer, it has no decimal point (e.g. "5"). If the number is a decimal with integer value, it has a trailing dot (e.g. "5."). If the number is a decimal with no integer value, it uses a normal dot separator (e.g. "5.25"). |
| `Math.Arithmetic.Negative` | The numeric negative of its subexpression | One | The expression to be expressed as negative | |
| `Math.Arithmetic.Addition` | The addition of its subexpressions | Two or more | The addends of the addition | |
| `Math.Arithmetic.Multiplication` | The multiplication of its subexpressions | Two or more | The factors of the multiplication | |
| `Math.Arithmetic.Division` | The division of two subexpressions, the dividend and the divisor | Two | Subexpression 1: The dividend; subexpression 2: the divisor | |
| `Math.Arithmetic.Exponentiation` | The exponentiation of two subexpressions | Two | Subexpression 1: The base; subexpression 2: the exponent | |
| `Math.Arithmetic.SquareRoot` | The square root of its subexpression | One | The radicand | |
| `Math.Arithmetic.AbsoluteValue` | The absolute value of its subexpression | One | The expression whose absolute value is taken | |
| `Math.Arithmetic.Floor` | The largest integer not greater than its subexpression, optionally at a given scale | One or two | Subexpression 1: the expression to floor; subexpression 2 (optional): the scale, i.e. the number of decimal places for the result (can be negative) | |
| `Math.Arithmetic.Ceiling` | The smallest integer not less than its subexpression, optionally at a given scale | One or two | Subexpression 1: the expression to ceil; subexpression 2 (optional): the scale, i.e. the number of decimal places for the result (can be negative) | |
| `Math.Arithmetic.Factorial` | The factorial of its subexpression | One | The expression whose factorial is to be denoted | |
| `Math.Arithmetic.Summation` | The summation (Σ) of an expression over a range or collection | Three, four, or five | Subexpression 1: the expression to sum; subexpression 2: the iteration variable; if three subexpressions: subexpression 3 is the collection to iterate over; if four: subexpression 3 is the lower bound, subexpression 4 is the upper bound; if five: subexpression 3 is the lower bound, subexpression 4 is the upper bound, subexpression 5 is the step | |
| `Math.Arithmetic.Product` | The product (Π) of an expression over a range or collection | Three, four, or five | Subexpression 1: the expression to multiply; subexpression 2: the iteration variable; if three subexpressions: subexpression 3 is the collection to iterate over; if four: subexpression 3 is the lower bound, subexpression 4 is the upper bound; if five: subexpression 3 is the lower bound, subexpression 4 is the upper bound, subexpression 5 is the step | |
| `Math.Arithmetic.Piecewise` | A piecewise-defined expression: a list of (value, condition) pairs with an optional fallback | Two or more | Subexpressions in pairs: subexpression 1 is the value for case 1, subexpression 2 is the condition for case 1, subexpression 3 is the value for case 2, subexpression 4 is the condition for case 2, and so on. If the total number of subexpressions is odd, the last subexpression is the "otherwise" fallback value | |

#### Notes

A `Math.Number` expression can hold non-negative values only. To express the negative number -5, a `Math.Arithmetic.Negative` expression must be used:

```xml
<expression tag="Math.Arithmetic.Negative">
    <expression tag="Math.Number" Value="5"/>
</expression>
```

There is no expression for representing rational numbers. To express the rational number 2/3, a `Math.Arithmetic.Division` expression must be used:

```xml
<expression tag="Math.Arithmetic.Division">
    <expression tag="Math.Number" Value="2"/>
    <expression tag="Math.Number" Value="3"/>
</expression>
```

To represent the negative rational -(3/4):

```xml
<expression tag="Math.Arithmetic.Negative">
    <expression tag="Math.Arithmetic.Division">
        <expression tag="Math.Number" Value="3"/>
        <expression tag="Math.Number" Value="4"/>
    </expression>
</expression>
```

There is no expression for representing a subtraction. The operation `x - y` is expressed as an addition with a negative addend `x + (-y)`:

```xml
<expression tag="Math.Arithmetic.Addition">
    <expression tag="Symbolic.Symbol" Name="x"/>
    <expression tag="Math.Arithmetic.Negative">
        <expression tag="Symbolic.Symbol" Name="y"/>
    </expression>
</expression>
```

The summation Σ (i=1 to n) of i² is expressed as (four subexpressions: body, variable, lower bound, upper bound):

```xml
<expression tag="Math.Arithmetic.Summation">
    <expression tag="Math.Arithmetic.Exponentiation">
        <expression tag="Symbolic.Symbol" Name="i"/>
        <expression tag="Math.Number" Value="2"/>
    </expression>
    <expression tag="Symbolic.Symbol" Name="i"/>
    <expression tag="Math.Number" Value="1"/>
    <expression tag="Symbolic.Symbol" Name="n"/>
</expression>
```

A piecewise expression for |x| (absolute value defined by cases) is expressed as (value₁, condition₁, value₂, condition₂, fallback):

```xml
<expression tag="Math.Arithmetic.Piecewise">
    <expression tag="Symbolic.Symbol" Name="x"/>
    <expression tag="Relation.GreaterOrEquals">
        <expression tag="Symbolic.Symbol" Name="x"/>
        <expression tag="Math.Number" Value="0"/>
    </expression>
    <expression tag="Math.Arithmetic.Negative">
        <expression tag="Symbolic.Symbol" Name="x"/>
    </expression>
    <expression tag="Relation.Less">
        <expression tag="Symbolic.Symbol" Name="x"/>
        <expression tag="Math.Number" Value="0"/>
    </expression>
</expression>
```

### Arithmetic — Literals and constants

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Infinity` | The positive infinity literal (∞) | Zero | | |
| `Math.Constant.Pi` | The mathematical constant π (pi) | Zero | | |
| `Math.Constant.Euler` | The mathematical constant e (Euler's number) | Zero | | |

### Arithmetic — Rounding modes

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Arithmetic.RoundingMode.TowardsZero` | The rounding mode: round towards zero (truncate) | Zero | | |
| `Math.Arithmetic.RoundingMode.AwayFromZero` | The rounding mode: round away from zero | Zero | | |
| `Math.Arithmetic.RoundingMode.TowardsMinusInfinity` | The rounding mode: round towards minus infinity (floor) | Zero | | |
| `Math.Arithmetic.RoundingMode.TowardsInfinity` | The rounding mode: round towards positive infinity (ceiling) | Zero | | |
| `Math.Arithmetic.RoundingMode.Nearest.HalfTowardsZero` | The rounding mode: round to nearest, half towards zero | Zero | | |
| `Math.Arithmetic.RoundingMode.Nearest.HalfAwayFromZero` | The rounding mode: round to nearest, half away from zero (the common "school" rounding) | Zero | | |
| `Math.Arithmetic.RoundingMode.Nearest.HalfTowardsMinusInfinity` | The rounding mode: round to nearest, half towards minus infinity | Zero | | |
| `Math.Arithmetic.RoundingMode.Nearest.HalfTowardsInfinity` | The rounding mode: round to nearest, half towards positive infinity | Zero | | |
| `Math.Arithmetic.RoundingMode.Nearest.HalfEven` | The rounding mode: round to nearest, half to even (banker's rounding) | Zero | | |

### Arithmetic — Rounding operations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Arithmetic.Truncate` | The truncation of its subexpression towards zero, optionally at a given scale | One or two | Subexpression 1: the expression to truncate; subexpression 2 (optional): the scale, i.e. the number of decimal places (can be negative) | |
| `Math.Arithmetic.Round` | The rounding of its subexpression using the current rounding mode, optionally at a given scale | One or two | Subexpression 1: the expression to round; subexpression 2 (optional): the scale, i.e. the number of decimal places (can be negative) | |

### Arithmetic — Euclidean division

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Arithmetic.Div` | The quotient of the Euclidean division of its two subexpressions | Two | Subexpression 1: the dividend; subexpression 2: the divisor | |
| `Math.Arithmetic.Mod` | The remainder of the Euclidean division of its two subexpressions | Two | Subexpression 1: the dividend; subexpression 2: the divisor | |

### Arithmetic — Factors and divisors

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Arithmetic.GreatestCommonDivisor` | The greatest common divisor of its subexpressions | Two or more | The integer expressions | |
| `Math.Arithmetic.LeastCommonMultiple` | The least common multiple of its subexpressions | Two or more | The integer expressions | |
| `Math.Arithmetic.Divides` | The divisibility relation: whether subexpression 1 divides subexpression 2 | Two | Subexpression 1: the divisor; subexpression 2: the dividend | |
| `Math.Arithmetic.DoesNotDivide` | The non-divisibility relation: whether subexpression 1 does not divide subexpression 2 | Two | Subexpression 1: the divisor; subexpression 2: the dividend | |

### Arithmetic — Transcendental functions

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Transcendental.DecimalLogarithm` | The base-10 logarithm of its subexpression | One | The expression whose base-10 logarithm is denoted | |
| `Math.Transcendental.NaturalLogarithm` | The natural (base-e) logarithm of its subexpression | One | The expression whose natural logarithm is denoted | |
| `Math.Transcendental.BinaryLogarithm` | The base-2 logarithm of its subexpression | One | The expression whose base-2 logarithm is denoted | |
| `Math.Transcendental.Logarithm` | The logarithm of its first subexpression in the base given by its second subexpression | Two | Subexpression 1: the expression whose logarithm is denoted; subexpression 2: the base | |

### Arithmetic — Trigonometric functions

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Trigonometric.Sine` | The sine of its subexpression | One | The angle | |
| `Math.Trigonometric.Cosine` | The cosine of its subexpression | One | The angle | |
| `Math.Trigonometric.Tangent` | The tangent of its subexpression | One | The angle | |
| `Math.Trigonometric.Cotangent` | The cotangent of its subexpression | One | The angle | |
| `Math.Trigonometric.Secant` | The secant of its subexpression | One | The angle | |
| `Math.Trigonometric.Cosecant` | The cosecant of its subexpression | One | The angle | |
| `Math.Trigonometric.ArcSine` | The arcsine of its subexpression | One | The expression | |
| `Math.Trigonometric.ArcCosine` | The arccosine of its subexpression | One | The expression | |
| `Math.Trigonometric.ArcTangent` | The arctangent of its subexpression | One | The expression | |
| `Math.Trigonometric.ArcCotangent` | The arccotangent of its subexpression | One | The expression | |
| `Math.Trigonometric.ArcSecant` | The arcsecant of its subexpression | One | The expression | |
| `Math.Trigonometric.ArcCosecant` | The arccosecant of its subexpression | One | The expression | |
| `Math.Trigonometric.ArcTangent2` | The two-argument arctangent (atan2): the angle of the point (subexpression 2, subexpression 1) from the positive x-axis | Two | Subexpression 1: the y coordinate; subexpression 2: the x coordinate | |

### Arithmetic — Hyperbolic functions

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Hyperbolic.Sine` | The hyperbolic sine of its subexpression | One | The expression | |
| `Math.Hyperbolic.Cosine` | The hyperbolic cosine of its subexpression | One | The expression | |
| `Math.Hyperbolic.Tangent` | The hyperbolic tangent of its subexpression | One | The expression | |
| `Math.Hyperbolic.Cotangent` | The hyperbolic cotangent of its subexpression | One | The expression | |
| `Math.Hyperbolic.Secant` | The hyperbolic secant of its subexpression | One | The expression | |
| `Math.Hyperbolic.Cosecant` | The hyperbolic cosecant of its subexpression | One | The expression | |
| `Math.Hyperbolic.ArcSine` | The inverse hyperbolic sine of its subexpression | One | The expression | |
| `Math.Hyperbolic.ArcCosine` | The inverse hyperbolic cosine of its subexpression | One | The expression | |
| `Math.Hyperbolic.ArcTangent` | The inverse hyperbolic tangent of its subexpression | One | The expression | |
| `Math.Hyperbolic.ArcCotangent` | The inverse hyperbolic cotangent of its subexpression | One | The expression | |
| `Math.Hyperbolic.ArcSecant` | The inverse hyperbolic secant of its subexpression | One | The expression | |
| `Math.Hyperbolic.ArcCosecant` | The inverse hyperbolic cosecant of its subexpression | One | The expression | |

---

### Complex numbers

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Complex.ImaginaryUnit` | The imaginary unit literal (ℹ), i.e. the square root of −1 | Zero | | |
| `Math.Complex.Conjugate` | The complex conjugate of its subexpression | One | The complex expression whose conjugate is taken | |

#### Notes

There does not exist a single expression to hold a complex number. This must be created as a combination of `Math.Number`, `Math.Arithmetic.Addition`, `Math.Arithmetic.Negative`, `Math.Arithmetic.Division` and `Math.Complex.ImaginaryUnit` expressions.

Example 1. The purely imaginary number 5ℹ is represented as:

```xml
<expression tag="Math.Arithmetic.Multiplication">
    <expression tag="Math.Number" Value="5"/>
    <expression tag="Math.Complex.ImaginaryUnit"/>
</expression>
```

Example 2. The purely imaginary number -(2/3 ℹ) is represented as:

```xml
<expression tag="Math.Arithmetic.Negative">
    <expression tag="Math.Arithmetic.Multiplication">
        <expression tag="Math.Arithmetic.Division">
            <expression tag="Math.Number" Value="2"/>
            <expression tag="Math.Number" Value="3"/>
        </expression>
        <expression tag="Math.Complex.ImaginaryUnit"/>
    </expression>
</expression>
```

Example 3. The complex number (2 + ℹ) is represented as:

```xml
<expression tag="Math.Arithmetic.Addition">
    <expression tag="Math.Number" Value="2"/>
    <expression tag="Math.Complex.ImaginaryUnit"/>
</expression>
```

Example 4. The complex number (2/3 - 10ℹ) is represented as:

```xml
<expression tag="Math.Arithmetic.Addition">
    <expression tag="Math.Arithmetic.Division">
        <expression tag="Math.Number" Value="2"/>
        <expression tag="Math.Number" Value="3"/>
    </expression>
    <expression tag="Math.Arithmetic.Negative">
        <expression tag="Math.Arithmetic.Multiplication">
            <expression tag="Math.Number" Value="10"/>
            <expression tag="Math.Complex.ImaginaryUnit"/>
        </expression>
    </expression>
</expression>
```

---

### Relations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Relation.Equals` | The equality relation between its two subexpressions | Two | Subexpression 1: the left-hand side; subexpression 2: the right-hand side | |
| `Relation.Different` | The inequality relation between its two subexpressions | Two | Subexpression 1: the left-hand side; subexpression 2: the right-hand side | |
| `Relation.Less` | The less-than relation between its two subexpressions | Two | Subexpression 1: the left-hand side; subexpression 2: the right-hand side | |
| `Relation.LessOrEquals` | The less-than-or-equal-to relation between its two subexpressions | Two | Subexpression 1: the left-hand side; subexpression 2: the right-hand side | |
| `Relation.Greater` | The greater-than relation between its two subexpressions | Two | Subexpression 1: the left-hand side; subexpression 2: the right-hand side | |
| `Relation.GreaterOrEquals` | The greater-than-or-equal-to relation between its two subexpressions | Two | Subexpression 1: the left-hand side; subexpression 2: the right-hand side | |
| `Relation.In` | The membership relation: whether subexpression 1 is a member of subexpression 2 | Two | Subexpression 1: the element to test; subexpression 2: the list | |
| `Relation.NotIn` | The non-membership relation: whether subexpression 1 is not a member of subexpression 2 | Two | Subexpression 1: the element to test; subexpression 2: the list | |
| `Relation.Min` | The minimum value among its subexpressions | One or more | The expressions to compare | |
| `Relation.Max` | The maximum value among its subexpressions | One or more | The expressions to compare | |

---

### Logic — Boolean literals

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Logic.True` | The logical truthful literal | Zero | | |
| `Logic.False` | The logical falsehood literal | Zero | | |

### Logic — Basic logical operations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Logic.Negation` | The logical negation of its subexpression | One | The expression to be logically negated | |
| `Logic.Conjunction` | The logical conjunction (AND) of its subexpressions | Two or more | The expressions to be operated under logical conjunction | |
| `Logic.Disjunction` | The logical disjunction (OR) of its subexpressions | Two or more | The expressions to be operated under logical disjunction | |
| `Logic.Implication` | The material conditional of its two subexpressions | Two | Subexpression 1: the antecedent; subexpression 2: the consequent | |
| `Logic.Equivalence` | The logical biconditional (if and only if) of its subexpressions | Two or more | The expressions to be operated under logical equivalence | |
| `Logic.ExclusiveDisjunction` | The logical exclusive disjunction (XOR) of its subexpressions | Two or more | The expressions to be operated under exclusive disjunction | |

### Logic — Big operators

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Logic.BigConjunction` | The conjunction (AND) of an expression over a range or collection | Three, four, or five | Subexpression 1: the expression to conjoin; subexpression 2: the iteration variable; if three subexpressions: subexpression 3 is the collection to iterate over; if four: subexpression 3 is the lower bound, subexpression 4 is the upper bound; if five: subexpression 3 is the lower bound, subexpression 4 is the upper bound, subexpression 5 is the step | |
| `Logic.BigDisjunction` | The disjunction (OR) of an expression over a range or collection | Three, four, or five | Subexpression 1: the expression to disjoin; subexpression 2: the iteration variable; if three subexpressions: subexpression 3 is the collection to iterate over; if four: subexpression 3 is the lower bound, subexpression 4 is the upper bound; if five: subexpression 3 is the lower bound, subexpression 4 is the upper bound, subexpression 5 is the step | |
| `Logic.BigEquivalence` | The equivalence (biconditional) of an expression over a range or collection | Three, four, or five | Subexpression 1: the expression to test for equivalence; subexpression 2: the iteration variable; if three subexpressions: subexpression 3 is the collection to iterate over; if four: subexpression 3 is the lower bound, subexpression 4 is the upper bound; if five: subexpression 3 is the lower bound, subexpression 4 is the upper bound, subexpression 5 is the step | |
| `Logic.BigExclusiveDisjunction` | The exclusive disjunction (XOR) of an expression over a range or collection | Three, four, or five | Subexpression 1: the expression to exclusively disjoin; subexpression 2: the iteration variable; if three subexpressions: subexpression 3 is the collection to iterate over; if four: subexpression 3 is the lower bound, subexpression 4 is the upper bound; if five: subexpression 3 is the lower bound, subexpression 4 is the upper bound, subexpression 5 is the step | |

### Logic — Predicates and quantifiers

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Logic.Predicate` | A named predicate with optional arguments; rendered as a label when it has no subexpressions, or as a function call when it has one or more | Zero or more | The arguments to the predicate | "Name": the name of the predicate |
| `Logic.ForAll` | The universal quantifier (∀): asserts that its formula holds for all values of the bound variable | Two | Subexpression 1: the bound variable; subexpression 2: the formula that must hold | |
| `Logic.Exists` | The existential quantifier (∃): asserts that there exists at least one value of the bound variable for which its formula holds | Two | Subexpression 1: the bound variable; subexpression 2: the formula that must hold | |

---

### Strings

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `String.String` | A computer or programming string | Zero | | "Value": the raw string |
| `String.Text` | A textual value | Zero | | "Value": the text as a raw string |
| `String.RegularExpression` | A computer or programming regular expression pattern | Zero | | "Value": the pattern as a raw string |
| `String.Concatenation` | The concatenation of two or more expressions | Two or more | the expressions to concatenate | |

#### Notes

A `String.String` expression is intended to represent a piece of text that would be operated by a computer and therefore its content must be taken exactly as it is, e.g. a user name, a file name or a variable name of a program, or to be processed by a computer program (e.g. to get its length, to extract a substring, etc.)

A `String.Text` expression is intended to represent arbitrary text, to be used by humans or AI models, e.g. a set of instructions.

There are expressions that make a distinction between `String.String` and `String.Text` expressions, for an example, see the `Typesetting.Paragraph` expression (described below).

Arbitrary text processing tasks such as (human) language translation or spell checking could be applied to a `String.Text` expression, but not to a `String.String` expression.

When embedding human-readable text in a composed document or a conversational response, always use `String.Text`. Use `String.String` only when the value is an opaque identifier or a string to be processed programmatically (e.g. a file name, a variable name, a regular expression pattern).

---

### Internet

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Internet.Hyperlink` | A hyperlink, displayed as its description text | Zero | | "Value": the URL string; "Description": the human-readable label displayed on the canvas |

---

### Localization — Locale component literals

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Localization.Language.Language` | A language literal, displayed as its localized name | Zero | | "Value": BCP 47 language subtag code (e.g. "en", "es", "zh") |
| `Localization.Country.Country` | A country or region literal, displayed as its localized name | Zero | | "Value": ISO 3166-1 alpha-2 country code (e.g. "US", "MX") |
| `Localization.Script.Script` | A writing script literal, displayed as its localized name | Zero | | "Value": ISO 15924 script code (e.g. "Latn", "Arab") |
| `Localization.Numeral.Numeral` | A numeral system literal, displayed as its localized name | Zero | | "Value": Unicode CLDR numeral system code (e.g. "latn", "arab") |
| `Localization.Calendar.Calendar` | A calendar system literal, displayed as its localized name | Zero | | "Value": Unicode CLDR calendar code (e.g. "gregory", "islamic", "buddhist") |
| `Localization.Locale.Locale` | A locale literal, displayed as its localized name | Zero | | "Value": locale identifier (e.g. "en_US", "es_MX", "zh_Hans_CN") |
| `Localization.TimeZone.TimeZone` | A time zone literal, displayed as its IANA identifier | Zero | | "Value": IANA time zone identifier (e.g. "America/New_York", "Europe/Paris") |

---

### Time — Time literal

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Time.Time` | Denotes a specific point in time | Zero | | "Value": milliseconds since the Unix epoch as an integer |

#### Notes

There does not exist an expression to represent time with day granularity (a "date" data type). However, a `Time.Time` expression, when it represents a point in time at 0:00 hrs (in the current timezone), it does not show time of the day.

### Time — Month literals

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Time.Gregorian.Month.January` | The January month literal | Zero | | |
| `Time.Gregorian.Month.February` | The February month literal | Zero | | |
| `Time.Gregorian.Month.March` | The March month literal | Zero | | |
| `Time.Gregorian.Month.April` | The April month literal | Zero | | |
| `Time.Gregorian.Month.May` | The May month literal | Zero | | |
| `Time.Gregorian.Month.June` | The June month literal | Zero | | |
| `Time.Gregorian.Month.July` | The July month literal | Zero | | |
| `Time.Gregorian.Month.August` | The August month literal | Zero | | |
| `Time.Gregorian.Month.September` | The September month literal | Zero | | |
| `Time.Gregorian.Month.October` | The October month literal | Zero | | |
| `Time.Gregorian.Month.November` | The November month literal | Zero | | |
| `Time.Gregorian.Month.December` | The December month literal | Zero | | |

### Time — Weekday literals

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Time.Gregorian.WeekDay.Sunday` | The Sunday weekday literal | Zero | | |
| `Time.Gregorian.WeekDay.Monday` | The Monday weekday literal | Zero | | |
| `Time.Gregorian.WeekDay.Tuesday` | The Tuesday weekday literal | Zero | | |
| `Time.Gregorian.WeekDay.Wednesday` | The Wednesday weekday literal | Zero | | |
| `Time.Gregorian.WeekDay.Thursday` | The Thursday weekday literal | Zero | | |
| `Time.Gregorian.WeekDay.Friday` | The Friday weekday literal | Zero | | |
| `Time.Gregorian.WeekDay.Saturday` | The Saturday weekday literal | Zero | | |

---

### Expression — Introspection

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Expression.Child` | Denotes a subexpression of an expression by index | Two | Subexpression 1: the expression to index into; subexpression 2: the index spec — a positive integer (1-based), a negative integer (counting from the end) | |
| `Expression.Cardinality` | Denotes the number of subexpressions of an expression | One | The expression to measure the number of its subexpressions | |

---

### Lists

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `List.List` | A list (or vector, or array) of elements | Zero or more | Each subexpression is an element of the list | |
| `List.CartesianProduct` | Denotes the Cartesian product of two or more lists, producing a list of all combinations | Two or more | Each subexpression is a list contributing to the product | |
| `List.CartesianExponentiation` | Denotes the Cartesian product of a list with itself n times | Two | Subexpression 1: the list; subexpression 2: the exponent (non-negative integer) | |
| `List.DotProduct` | Denotes the dot product (sum of element-wise products) of two equal-length vectors | Two | Subexpression 1: the first vector; subexpression 2: the second vector | |
| `List.OuterProduct` | Denotes the outer product of two vectors, producing an m×n matrix where element [i,j] is the product of element i of the first vector and element j of the second | Two | Subexpression 1: the first vector (length m); subexpression 2: the second vector (length n) | |
| `List.PowerSet` | Denotes the power set (set of all subsets) of a list | One | The input list | |

#### Notes

There does not exist an expression to represent mathematical vectors. For this purpose, a `List.List` expression is used.

---

### Matrices — Matrix operations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Math.Matrix.Determinant` | The determinant of a square matrix | One | The square matrix | |
| `Math.Matrix.Transpose` | The transpose of a matrix (rows and columns swapped) | One | The matrix to transpose | |
| `Math.Matrix.Adjoint` | The conjugate transpose of a matrix (transpose with each element replaced by its complex conjugate) | One | The matrix | |
| `Math.Matrix.KroneckerProduct` | The Kronecker (tensor) product of two or more matrices | Two or more | Each subexpression is a matrix | |

#### Notes

There does not exist a single expression to represent matrices. A matrix is just a `List.List` containing one or several `List.List` subexpressions with the same cardinality.

### Matrices — Tables

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `List.Table` | Denotes the visualization of a matrix as a bidimensional table | One or two | Subexpression 1: the matrix to display as a table; subexpression 2 (optional): a list used as a header row | |
| `List.UndecoratedTable` | Denotes the visualization of a matrix as a bidimensional table without grid line decorations | One or two | Subexpression 1: the matrix to display as an undecorated table; subexpression 2 (optional): a list used as a header row | |

---

### Symbolic — Symbols and scope

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Symbolic.Symbol` | Denotes a symbol | Zero | | "Name": the name of the symbol |
| `Symbolic.Assignment` | Denotes the binding of an expression to a target symbol | Two | Subexpression 1: the assignment target — a symbol (simple binding), a `List.List` of symbols (destructuring assignment, the right-hand side must be to a list of the same length), or a function application `Symbolic.Function` (a function definition or function abstraction); subexpression 2: the value or body expression | |
| `Symbolic.Local` | Denotes the declaration of a local scope for a symbol or an assignment, so the binding does not propagate to the enclosing scope | One | The expression to scope locally: a symbol (local declaration), an assignment (local binding), a `List.List` of symbols (multiple local declarations), an assignment whose left-hand side is a list of symbols (local destructuring), or a function definition | |

#### Notes

`Symbolic.Assignment` represents the assignment operator, rendered as `←` (left arrow). The left-hand side (subexpression 1) is the target and the right-hand side (subexpression 2) is the value. For example, `x ← 5` assigns the value 5 to the symbol x:

```xml
<expression tag="Symbolic.Assignment">
    <expression tag="Symbolic.Symbol" Name="x"/>
    <expression tag="Math.Number" Value="5"/>
</expression>
```

### Symbolic — Functions and lambda calculus

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Symbolic.Function` | Denotes a function | Two | Subexpression 1: the function expression (typically a symbol); subexpression 2: the argument(s) — a single expression or a `List.List` of arguments | |
| `Symbolic.Lambda` | Denotes a lambda abstraction (anonymous function) | Two | Subexpression 1: the parameter(s) — a single symbol or a `List.List` of symbols; subexpression 2: the body expression | |
| `Symbolic.Return` | Denotes an early-return expression for use inside the body of a function or lambda expression; delivers its subexpression as the result of the enclosed function call or lambda application, bypassing any remaining body evaluation | One | The value to return | |

#### Notes

The same expression (`Symbolic.Function`) serves both as a function abstraction (definition) and as a function application (call); the distinction depends on context.

If a `Symbolic.Function` expression appears as the first subexpression of a `Symbolic.Assignment` expression, such as in:

f(x, y, ...) ← body

Then it is a function abstraction (or function definition).

In any other case it is a function application (or function call).

---

### Colors

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Color.Color` | A color literal | Zero | | "Red": the red component as a string representing a number between 0 and 1; "Green": the green component as a string representing a number between 0 and 1; "Blue": the blue component as a string representing a number between 0 and 1; "Alpha": the opacity as a string representing a number between 0 and 1 (0 = fully transparent, 1 = fully opaque) |

#### Notes

`Color.Color` is a standalone color value — it represents a color as data (e.g. the color red, or the color of a graph series). It is distinct from `Visualization.Color`, which is a visual wrapper that applies a color to a child expression for display purposes. Use `Color.Color` when a color is the subject of the expression; use `Visualization.Color` when you want to render an expression in a particular color.

---

### Bitwise — Logical operations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Bitwise.Not` | Denotes the bitwise inversion of every bit of an integer | One | The integer operand | |
| `Bitwise.And` | Denotes the bitwise AND of two or more integers, evaluated left-to-right | Two or more | The integer operands | |
| `Bitwise.Or` | Denotes the bitwise OR of two or more integers, evaluated left-to-right | Two or more | The integer operands | |
| `Bitwise.XOr` | Denotes the bitwise XOR of two or more integers, evaluated left-to-right | Two or more | The integer operands | |

### Bitwise — Shift operations

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Bitwise.LeftShift` | Denotes the shift of bits of an integer left by a given number of positions, filling vacated low bits with zeros | Two | Subexpression 1: the integer to shift; subexpression 2: the number of positions to shift left | |
| `Bitwise.RightShift` | Denotes the shifts on bits of an integer right by a given number of positions, filling vacated high bits with zeros (logical shift) | Two | Subexpression 1: the integer to shift; subexpression 2: the number of positions to shift right | |

---

### Programming — Block

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Programming.Block` | Denotes a sequential block of expressions | One or more | The expressions enclosed by the block | "Description": a human-readable label for the block (non-empty string); "Expanded": whether the block is displayed expanded or collapsed ("True" or "False") |

### Programming — Conditionals

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Programming.If` | Denotes a programming conditional: evaluates the condition; if true, evaluates the body | Two | Subexpression 1: the condition; subexpression 2: the body | |
| `Programming.IfElse` | Denotes a programming conditional with two branches: evaluates the condition; if true, evaluates the true-branch; if false, evaluates the false-branch | Three | Subexpression 1: the condition; subexpression 2: the true-branch; subexpression 3: the false-branch | |
| `Programming.InvertedIf` | Denotes a programming postfix conditional: same semantics as `Programming.If` but rendered in infix notation as "body if condition" | Two | Subexpression 1: the body; subexpression 2: the condition | |
| `Programming.Conditional` | Denotes a programming ternary value expression; semantically identical to `Programming.IfElse` but rendered differently; intended for value contexts rather than statement contexts | Three | Subexpression 1: the condition; subexpression 2: the true-value; subexpression 3: the false-value | |

### Programming — Loops

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Programming.While` | Denotes a programming "while" loop: repeatedly evaluates the condition; while true, evaluates the body and repeats; returns the result of the last body evaluation, or Null if the body was never executed | Two | Subexpression 1: the condition; subexpression 2: the body | |
| `Programming.Until` | Denotes a programming "do-until" loop: evaluates the body, then evaluates the condition; repeats until the condition is true; returns the body result from the last iteration | Two | Subexpression 1: the body; subexpression 2: the condition | |
| `Programming.ForTimes` | Denotes a programming counted loop: evaluates the body a fixed number of times; returns Null | Two | Subexpression 1: the body; subexpression 2: the count | |
| `Programming.ForFromTo` | Denotes a numeric range loop: iterates a symbol over a numeric range from a start value to an end value, with an optional step (default: 1); evaluates the body on each iteration; returns the result of the last body evaluation | Four or five | Subexpression 1: the body; subexpression 2: the iteration variable (must be a `Symbolic.Symbol`); subexpression 3: the start value; subexpression 4: the end value; subexpression 5 (optional): the step | |
| `Programming.ForIn` | Denotes a programming collection loop: iterates a symbol over each element of a list; evaluates the body for each element; returns the result of the last body evaluation | Three | Subexpression 1: the body; subexpression 2: the iteration variable (must be a `Symbolic.Symbol`); subexpression 3: the list | |

### Programming — Inverted loops (postfix form)

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Programming.InvertedForTimes` | Denotes a programming postfix counted loop; semantically identical to `Programming.ForTimes` but rendered with the expression first | Two | Subexpression 1: the body expression; subexpression 2: the count | |
| `Programming.InvertedForFromTo` | Denotes a programming postfix numeric range loop; semantically identical to `Programming.ForFromTo` but rendered with the expression first, using symbolic notation (=, .., Δ) for the range | Four or five | Subexpression 1: the body expression; subexpression 2: the iteration variable (must be a `Symbolic.Symbol`); subexpression 3: the start value; subexpression 4: the end value; subexpression 5 (optional): the step | |
| `Programming.InvertedForIn` | Denotes a programming postfix collection loop; semantically identical to `Programming.ForIn` but rendered with the expression first | Three | Subexpression 1: the body expression; subexpression 2: the iteration variable (must be a `Symbolic.Symbol`); subexpression 3: the list | |

### Programming — Cycle

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Programming.Cycle` | Denotes a programming polymorphic loop; rendered with the ⟳ symbol; dispatches based on child count: 2 children → ForTimes, 3 children → ForIn, 4–5 children → ForFromTo; semantics are identical to the corresponding loop form | Two, three, four, or five | Same child layout as the corresponding loop form (`Programming.ForTimes`, `Programming.ForIn`, or `Programming.ForFromTo`) | |

#### Notes

There does not exist an expression to represent a programming variable. A `Symbolic.Symbol` expression is used for that purpose.

Although loop expressions, and their "inverted" and "cycle" counterparts operate exactly the same way, there are differences, mainly for style:

The "inverted" counterparts should be used where the body is "simple" (usually when it is not a `Programming.Block` expression).

The "cycle" counterparts should be used when there are two or more nested cycles, where the body of each non-final cycle is a cycle. The body of the final cycle can be a `Programming.Block` or not. This notation for nested operators is common in other "Big" operators, such as summation.

### Programming — Switch

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Programming.ComparativeSwitch` | Denotes a programming "switch" by value: evaluates a comparand once, then tests it against each case value in order using equality (or membership if the case value is a `List.List`); on the first match, evaluates and returns the corresponding action; if no match and an else branch is present, evaluates and returns it; otherwise returns Null | Three or more | Subexpression 1: the comparand; then alternating pairs — subexpression 2: first case value; subexpression 3: first case action; subexpression 4: second case value; subexpression 5: second case action; and so on; if the total number of subexpressions is even, the last subexpression is the else branch | |
| `Programming.ConditionalSwitch` | Denotes a programming "switch" by condition: evaluates each condition in order; on the first condition that evaluates to true, evaluates the corresponding action; if no condition is true and an else branch is present, evaluates and returns it; otherwise returns Null | Two or more | Alternating pairs — subexpression 1: first condition; subexpression 2: first action; subexpression 3: second condition; subexpression 4: second action; and so on; if the total number of subexpressions is odd, the last subexpression is the else branch | |

#### Notes

A `Programming.ComparativeSwitch` with two cases and an else branch has five subexpressions: comparand, case1-value, case1-action, case2-value, case2-action, else (even count → last is else):

```xml
<expression tag="Programming.ComparativeSwitch">
    <expression tag="Symbolic.Symbol" Name="x"/>
    <expression tag="Math.Number" Value="1"/>
    <expression tag="String.Text" Value="one"/>
    <expression tag="Math.Number" Value="2"/>
    <expression tag="String.Text" Value="two"/>
    <expression tag="String.Text" Value="other"/>
</expression>
```

A `Programming.ConditionalSwitch` with two conditions and an else branch has five subexpressions: cond1, action1, cond2, action2, else (odd count → last is else):

```xml
<expression tag="Programming.ConditionalSwitch">
    <expression tag="Relation.Less">
        <expression tag="Symbolic.Symbol" Name="x"/>
        <expression tag="Math.Number" Value="0"/>
    </expression>
    <expression tag="String.Text" Value="negative"/>
    <expression tag="Relation.Greater">
        <expression tag="Symbolic.Symbol" Name="x"/>
        <expression tag="Math.Number" Value="0"/>
    </expression>
    <expression tag="String.Text" Value="positive"/>
    <expression tag="String.Text" Value="zero"/>
</expression>
```

---

### Graphics

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Graphics.RasterGraphics` | Represents a raster (bitmap) graphics | Zero | | "Value": the image encoded as base64 PNG data; "Format": the image format (always "image/png") |

---

### Diagramming

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Diagramming.Tree` | A tree diagram node; displays a root content and zero or more subtree branches | One or more | Subexpression 1: the root content; subexpressions 2 and beyond: child branches (typically `Diagramming.Tree` nodes), displayed when the node is expanded | "Expanded": whether the child branches are currently visible ("True" or "False") |

---

### Visualization — Layout

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Visualization.Rectangle` | An invisible rectangle with explicit layout metrics; used as a spacer or placeholder with defined baseline positions | Zero | | "Width": width in pixels (positive integer); "Height": height in pixels (positive integer); "HorizontalBaseline": y-coordinate of the horizontal baseline within [0, Height]; "VerticalBaseline": x-coordinate of the vertical baseline within [0, Width] |
| `Visualization.HorizontalArray` | Lays out two or more expressions in a horizontal row, with 5-pixel gaps between them | Two or more | Each subexpression is an element placed left-to-right | |
| `Visualization.VerticalArray` | Lays out two or more expressions in a vertical column, with 5-pixel gaps between them | Two or more | Each subexpression is an element placed top-to-bottom | |
| `Visualization.CodeBlock` | A block of preformatted code text displayed in a monospaced font on a light gray background | Zero | | "Value": the code text (string) |

### Visualization — Text and font formatting

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Visualization.Color` | Denotes the visualization of its subexpression in a specified color | One | The expression to colorize | "Red": red component (float, 0–1); "Green": green component (float, 0–1); "Blue": blue component (float, 0–1); "Alpha": opacity component (float, 0–1) |
| `Visualization.Bold` | Denotes the visualization of its subexpression with bold font; can set boldness absolutely or toggle it relative to the parent context | One | The expression to make bold | "Value": whether bold is on ("True" or "False"); "Set": if "True", applies Value absolutely; if "False", toggles the inherited boldness |
| `Visualization.Italic` | Denotes the visualization of its subexpression with italic font; can set italicness absolutely or toggle it relative to the parent context | One | The expression to make italic | "Value": whether italic is on ("True" or "False"); "Set": if "True", applies Value absolutely; if "False", toggles the inherited italicness |
| `Visualization.Code` | Denotes the visualization of its subexpression in a monospaced font on a light gray background | One | The expression to display as inline code | |
| `Visualization.FontSize` | Denotes the visualization of its subexpression at an absolute font size | One | The expression to resize | "Size": the absolute font size (positive float) |
| `Visualization.FontSizeIncrement` | Denotes the visualization of its subexpression at a font size adjusted relative to the parent context | One | The expression to resize | "Increment": the size adjustment in points (positive to enlarge, negative to shrink; float) |
| `Visualization.FontName` | Denotes the visualization of its subexpression in a specified font family | One | The expression to reformat | "Name": the font family name (string, e.g., "Arial", "Courier New") |

### Visualization — Visual wrappers

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Visualization.CrossedOut` | Denotes the visualization of its subexpression with a diagonal line drawn through it | One | The expression to cross out | |
| `Visualization.Metrics` | Denotes the visualization of its subexpression with horizontal and vertical baseline guides drawn around it; used to visualize layout metrics | One | The expression whose metrics to visualize | |
| `Visualization.Invisible` | Denotes the visualization of its subexpression as blank space; the expression occupies its normal layout dimensions but is not drawn | One | The expression to hide | |
| `Visualization.Selected` | Denotes the visualization of its subexpression with a light gray selection background | One | The expression to show as selected | |
| `Visualization.Parentheses` | Denotes the visualization of its subexpression in parentheses | One | The expression to parenthesize | |
| `Visualization.Spurious` | Denotes the marking of its subexpression as spurious; rendered normally but semantically flagged | One | The expression to mark as spurious | |
| `Visualization.Key` | Denotes the visualization of its subexpression as a keyboard key (Arial font, 2 pt smaller, rounded rectangle border with padding) | One | The expression to render as a key label | |

#### Notes

`Visualization.Metrics`, `Visualization.Selected`, and `Visualization.Spurious` are used primarily when writing Fōrmulæ documentation that includes annotated expression examples. `Visualization.Metrics` draws baseline guides around an expression to illustrate its layout; `Visualization.Selected` renders a selection highlight; `Visualization.Spurious` marks an expression as semantically invalid (e.g. to illustrate an error). `Visualization.Key` renders inline keyboard key labels. These are not typically needed for general composing.

### Visualization — Structural expressions

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Visualization.Superscript` | Denotes the visualization of its second subexpression as a superscript of the first | Two | Subexpression 1: the base expression; subexpression 2: the superscript | |
| `Visualization.Subscript` | Denotes the visualization of its second subexpression as a subscript of the first | Two | Subexpression 1: the base expression; subexpression 2: the subscript | |
| `Visualization.Infix` | Denotes the visualization as an infix expression with a custom operator string rendered between each pair of adjacent operands | Two or more | Each subexpression is an operand | "Operator": the operator symbol (string) |

### Visualization — Ellipsis symbols

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Visualization.HorizontalEllipsis` | The horizontal ellipsis literal ⋯ | Zero | | |
| `Visualization.VerticalEllipsis` | The vertical ellipsis literal ⋮ | Zero | | |
| `Visualization.UpRightDiagonalEllipsis` | The up-right diagonal ellipsis literal ⋰ | Zero | | |
| `Visualization.DownRightDiagonalEllipsis` | The down-right diagonal ellipsis literal ⋱ | Zero | | |

### Visualization — Mathematical relation operators

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Visualization.PlusMinus` | The plus-or-minus relation ± between its operands | Two or more | The operands | |
| `Visualization.MinusPlus` | The minus-or-plus relation ∓ between its operands | Two or more | The operands | |
| `Visualization.Congruent` | The congruence relation ≡ between its operands | Two or more | The operands | |
| `Visualization.NotCongruent` | The non-congruence relation ≢ between its operands | Two or more | The operands | |
| `Visualization.FigureCongruent` | The geometric congruence relation ≅ between its operands | Two or more | The operands | |
| `Visualization.NotFigureCongruent` | The negated geometric congruence relation ≆ between its operands | Two or more | The operands | |
| `Visualization.ApproximatelyEquals` | The approximate equality relation ≈ between its operands | Two or more | The operands | |
| `Visualization.NotApproximatelyEquals` | The negated approximate equality relation ≉ between its operands | Two or more | The operands | |
| `Visualization.AsymptoticallyEquals` | The asymptotic equality relation ≃ between its operands | Two or more | The operands | |
| `Visualization.NotAsymptoticallyEquals` | The negated asymptotic equality relation ≄ between its operands | Two or more | The operands | |
| `Visualization.Proportional` | The proportionality relation ∼ between its operands | Two or more | The operands | |
| `Visualization.NotProportional` | The negated proportionality relation ≁ between its operands | Two or more | The operands | |

---

### Typesetting — Document structure

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Typesetting.Paragraph` | A word-wrapped paragraph; lays out a sequence of inline content items across multiple lines with proper typographic baselines | One or more | Each subexpression is an inline item: typically a `String.Text` (plain text), an `Internet.Hyperlink` (rendered in green), a `Typesetting.BoldChunk`, a `Typesetting.ItalicChunk`, or a `Typesetting.ColorChunk`; but any expression type is valid as an inline item (e.g. `Graphics.RasterGraphics` for inline images, mathematical expressions, etc.) | |
| `Typesetting.MultiParagraph` | Stacks two or more typesetting blocks vertically with 15-pixel spacing | Two or more | Each subexpression is a block-level typesetting element (`Typesetting.Paragraph`, `Typesetting.BulletedList`, `Typesetting.Centering`, `Typesetting.Rule`, or `Typesetting.MultiParagraph`) | |
| `Typesetting.BulletedList` | Displays its subexpressions as a bulleted list; each item is preceded by a bullet "•" and indented; lists may be nested, with indentation increasing per level | One or more | Each subexpression is a list item (typically a `Typesetting.Paragraph`) | |
| `Typesetting.NumberedList` | Displays its subexpressions as a numbered list; each item is preceded by its 1-based index followed by a period ("1.", "2.", …); number labels are right-aligned so all content starts at the same horizontal position regardless of label width; lists may be nested | One or more | Each subexpression is a list item (typically a `Typesetting.Paragraph`) | |
| `Typesetting.Centering` | Centers its single subexpression horizontally within the available width | One | The expression to center | |
| `Typesetting.Rule` | A horizontal rule spanning the full available width | Zero | | |

### Typesetting — Inline formatting chunks

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Typesetting.BoldChunk` | Toggles bold formatting for its inline subexpressions within a paragraph | One or more | Inline content items (same kinds as `Typesetting.Paragraph` subexpressions) | |
| `Typesetting.ItalicChunk` | Toggles italic formatting for its inline subexpressions within a paragraph | One or more | Inline content items (same kinds as `Typesetting.Paragraph` subexpressions) | |
| `Typesetting.ColorChunk` | Applies an RGBA fill color to its inline subexpressions within a paragraph | One or more | Inline content items (same kinds as `Typesetting.Paragraph` subexpressions) | "Red": red component (float, 0–1); "Green": green component (float, 0–1); "Blue": blue component (float, 0–1); "Alpha": opacity component (float, 0–1) |

#### Notes

The `Typesetting.Paragraph` expression can hold one or several subexpressions. These subexpressions usually are combinations of:

* `String.Text` expressions, containing textual information.
* "Chunk" expressions (`Typesetting.BoldChunk`, `Typesetting.ItalicChunk` and `Typesetting.ColorChunk`) to apply these format modifiers (bold, italic, color) to their subexpressions.
* Any other expression, such as mathematical formulae, images, etc.

A chunk expression can hold the same type of subexpressions as `Typesetting.Paragraph` expressions (`String.Text`, chunks, any other). Because chunk expressions can also hold chunk expressions, format can be combined, e.g. an italic chunk can contain a bold chunk, or vice versa (achieving the same visual result).

When a `Typesetting.Paragraph` is visualized, it separates the content of its subexpressions in "words" and keeps the metrics (width and height) of each one these words. The words are extracted according with the type of subexpression:

* For a `String.Text` expression, its serialized attribute `Value` is split using as separator a set of whitespace characters (spaces, tabs, etc.)
* For a `Internet.Hyperlink` expression, its serialized attribute `Description` is split using as separator a set of whitespace characters (spaces, tabs, etc.)
* For chunk expressions, the definition is recursive, but taking into account that certain formatting (e.g. bold) produce different metrics.
* Any other kind of expressions is considered itself a single word, with its own metrics, so it is never "broken".

Then, the paragraph is created as a set of "rows", where each row is formed as the maximum number of remaining words that fit in the available space, leaving between them a minimum space.

The `Typesetting.MultiParagraph` expression holds two or more subexpressions, usually of type `Typesetting.Paragraph`, but they can also be:

* A `Typesetting.BulletedList` expression. It usually contains a `Typesetting.Paragraph` or `Typesetting.MultiParagraph` expression. A bullet will be created for each of its subexpressions.
* A `Typesetting.NumberedList` expression. It usually contains a `Typesetting.Paragraph` or `Typesetting.MultiParagraph` expression. A sequential number will be created for each of its subexpressions.
* A `Typesetting.Centering` expression. It contains a single expression, which will be shown centrally aligned respect to the available space.
* Any other expression. Note that if the width of the expression is longer than the available space (e.g. a `String.Text` expression with a long text), the expression will be shown as it is. If the expression is intended to be split into several rows, it should be put inside a `Typesetting.Paragraph` expression.

---

### Chemistry — Element literals

Each chemical element is a distinct zero-subexpression literal expression whose tag encodes the element name. The expression displays as the element's standard chemical symbol.

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Chemistry.Element.Hydrogen` | The chemical element Hydrogen (H) | Zero | | |
| `Chemistry.Element.Helium` | The chemical element Helium (He) | Zero | | |
| `Chemistry.Element.Lithium` | The chemical element Lithium (Li) | Zero | | |
| `Chemistry.Element.Beryllium` | The chemical element Beryllium (Be) | Zero | | |
| `Chemistry.Element.Boron` | The chemical element Boron (B) | Zero | | |
| `Chemistry.Element.Carbon` | The chemical element Carbon (C) | Zero | | |
| `Chemistry.Element.Nitrogen` | The chemical element Nitrogen (N) | Zero | | |
| `Chemistry.Element.Oxygen` | The chemical element Oxygen (O) | Zero | | |
| `Chemistry.Element.Fluorine` | The chemical element Fluorine (F) | Zero | | |
| `Chemistry.Element.Neon` | The chemical element Neon (Ne) | Zero | | |
| `Chemistry.Element.Sodium` | The chemical element Sodium (Na) | Zero | | |
| `Chemistry.Element.Magnesium` | The chemical element Magnesium (Mg) | Zero | | |
| `Chemistry.Element.Aluminium` | The chemical element Aluminium (Al) | Zero | | |
| `Chemistry.Element.Silicon` | The chemical element Silicon (Si) | Zero | | |
| `Chemistry.Element.Phosphorus` | The chemical element Phosphorus (P) | Zero | | |
| `Chemistry.Element.Sulfur` | The chemical element Sulfur (S) | Zero | | |
| `Chemistry.Element.Chlorine` | The chemical element Chlorine (Cl) | Zero | | |
| `Chemistry.Element.Argon` | The chemical element Argon (Ar) | Zero | | |
| `Chemistry.Element.Potassium` | The chemical element Potassium (K) | Zero | | |
| `Chemistry.Element.Calcium` | The chemical element Calcium (Ca) | Zero | | |
| `Chemistry.Element.Scandium` | The chemical element Scandium (Sc) | Zero | | |
| `Chemistry.Element.Titanium` | The chemical element Titanium (Ti) | Zero | | |
| `Chemistry.Element.Vanadium` | The chemical element Vanadium (V) | Zero | | |
| `Chemistry.Element.Chromium` | The chemical element Chromium (Cr) | Zero | | |
| `Chemistry.Element.Manganese` | The chemical element Manganese (Mn) | Zero | | |
| `Chemistry.Element.Iron` | The chemical element Iron (Fe) | Zero | | |
| `Chemistry.Element.Cobalt` | The chemical element Cobalt (Co) | Zero | | |
| `Chemistry.Element.Nickel` | The chemical element Nickel (Ni) | Zero | | |
| `Chemistry.Element.Copper` | The chemical element Copper (Cu) | Zero | | |
| `Chemistry.Element.Zinc` | The chemical element Zinc (Zn) | Zero | | |
| `Chemistry.Element.Gallium` | The chemical element Gallium (Ga) | Zero | | |
| `Chemistry.Element.Germanium` | The chemical element Germanium (Ge) | Zero | | |
| `Chemistry.Element.Arsenic` | The chemical element Arsenic (As) | Zero | | |
| `Chemistry.Element.Selenium` | The chemical element Selenium (Se) | Zero | | |
| `Chemistry.Element.Bromine` | The chemical element Bromine (Br) | Zero | | |
| `Chemistry.Element.Krypton` | The chemical element Krypton (Kr) | Zero | | |
| `Chemistry.Element.Rubidium` | The chemical element Rubidium (Rb) | Zero | | |
| `Chemistry.Element.Strontium` | The chemical element Strontium (Sr) | Zero | | |
| `Chemistry.Element.Yttrium` | The chemical element Yttrium (Y) | Zero | | |
| `Chemistry.Element.Zirconium` | The chemical element Zirconium (Zr) | Zero | | |
| `Chemistry.Element.Niobium` | The chemical element Niobium (Nb) | Zero | | |
| `Chemistry.Element.Molybdenum` | The chemical element Molybdenum (Mo) | Zero | | |
| `Chemistry.Element.Technetium` | The chemical element Technetium (Tc) | Zero | | |
| `Chemistry.Element.Ruthenium` | The chemical element Ruthenium (Ru) | Zero | | |
| `Chemistry.Element.Rhodium` | The chemical element Rhodium (Rh) | Zero | | |
| `Chemistry.Element.Palladium` | The chemical element Palladium (Pd) | Zero | | |
| `Chemistry.Element.Silver` | The chemical element Silver (Ag) | Zero | | |
| `Chemistry.Element.Cadmium` | The chemical element Cadmium (Cd) | Zero | | |
| `Chemistry.Element.Indium` | The chemical element Indium (In) | Zero | | |
| `Chemistry.Element.Tin` | The chemical element Tin (Sn) | Zero | | |
| `Chemistry.Element.Antimony` | The chemical element Antimony (Sb) | Zero | | |
| `Chemistry.Element.Tellurium` | The chemical element Tellurium (Te) | Zero | | |
| `Chemistry.Element.Iodine` | The chemical element Iodine (I) | Zero | | |
| `Chemistry.Element.Xenon` | The chemical element Xenon (Xe) | Zero | | |
| `Chemistry.Element.Caesium` | The chemical element Caesium (Cs) | Zero | | |
| `Chemistry.Element.Barium` | The chemical element Barium (Ba) | Zero | | |
| `Chemistry.Element.Lanthanum` | The chemical element Lanthanum (La) | Zero | | |
| `Chemistry.Element.Cerium` | The chemical element Cerium (Ce) | Zero | | |
| `Chemistry.Element.Praseodymium` | The chemical element Praseodymium (Pr) | Zero | | |
| `Chemistry.Element.Neodymium` | The chemical element Neodymium (Nd) | Zero | | |
| `Chemistry.Element.Promethium` | The chemical element Promethium (Pm) | Zero | | |
| `Chemistry.Element.Samarium` | The chemical element Samarium (Sm) | Zero | | |
| `Chemistry.Element.Europium` | The chemical element Europium (Eu) | Zero | | |
| `Chemistry.Element.Gadolinium` | The chemical element Gadolinium (Gd) | Zero | | |
| `Chemistry.Element.Terbium` | The chemical element Terbium (Tb) | Zero | | |
| `Chemistry.Element.Dysprosium` | The chemical element Dysprosium (Dy) | Zero | | |
| `Chemistry.Element.Holmium` | The chemical element Holmium (Ho) | Zero | | |
| `Chemistry.Element.Erbium` | The chemical element Erbium (Er) | Zero | | |
| `Chemistry.Element.Thulium` | The chemical element Thulium (Tm) | Zero | | |
| `Chemistry.Element.Ytterbium` | The chemical element Ytterbium (Yb) | Zero | | |
| `Chemistry.Element.Lutetium` | The chemical element Lutetium (Lu) | Zero | | |
| `Chemistry.Element.Hafnium` | The chemical element Hafnium (Hf) | Zero | | |
| `Chemistry.Element.Tantalum` | The chemical element Tantalum (Ta) | Zero | | |
| `Chemistry.Element.Tungsten` | The chemical element Tungsten (W) | Zero | | |
| `Chemistry.Element.Rhenium` | The chemical element Rhenium (Re) | Zero | | |
| `Chemistry.Element.Osmium` | The chemical element Osmium (Os) | Zero | | |
| `Chemistry.Element.Iridium` | The chemical element Iridium (Ir) | Zero | | |
| `Chemistry.Element.Platinum` | The chemical element Platinum (Pt) | Zero | | |
| `Chemistry.Element.Gold` | The chemical element Gold (Au) | Zero | | |
| `Chemistry.Element.Mercury` | The chemical element Mercury (Hg) | Zero | | |
| `Chemistry.Element.Thallium` | The chemical element Thallium (Tl) | Zero | | |
| `Chemistry.Element.Lead` | The chemical element Lead (Pb) | Zero | | |
| `Chemistry.Element.Bismuth` | The chemical element Bismuth (Bi) | Zero | | |
| `Chemistry.Element.Polonium` | The chemical element Polonium (Po) | Zero | | |
| `Chemistry.Element.Astatine` | The chemical element Astatine (At) | Zero | | |
| `Chemistry.Element.Radon` | The chemical element Radon (Rn) | Zero | | |
| `Chemistry.Element.Francium` | The chemical element Francium (Fr) | Zero | | |
| `Chemistry.Element.Radium` | The chemical element Radium (Ra) | Zero | | |
| `Chemistry.Element.Actinium` | The chemical element Actinium (Ac) | Zero | | |
| `Chemistry.Element.Thorium` | The chemical element Thorium (Th) | Zero | | |
| `Chemistry.Element.Protactinium` | The chemical element Protactinium (Pa) | Zero | | |
| `Chemistry.Element.Uranium` | The chemical element Uranium (U) | Zero | | |
| `Chemistry.Element.Neptunium` | The chemical element Neptunium (Np) | Zero | | |
| `Chemistry.Element.Plutonium` | The chemical element Plutonium (Pu) | Zero | | |
| `Chemistry.Element.Americium` | The chemical element Americium (Am) | Zero | | |
| `Chemistry.Element.Curium` | The chemical element Curium (Cm) | Zero | | |
| `Chemistry.Element.Berkelium` | The chemical element Berkelium (Bk) | Zero | | |
| `Chemistry.Element.Californium` | The chemical element Californium (Cf) | Zero | | |
| `Chemistry.Element.Einsteinium` | The chemical element Einsteinium (Es) | Zero | | |
| `Chemistry.Element.Fermium` | The chemical element Fermium (Fm) | Zero | | |
| `Chemistry.Element.Mendelevium` | The chemical element Mendelevium (Md) | Zero | | |
| `Chemistry.Element.Nobelium` | The chemical element Nobelium (No) | Zero | | |
| `Chemistry.Element.Lawrencium` | The chemical element Lawrencium (Lr) | Zero | | |
| `Chemistry.Element.Rutherfordium` | The chemical element Rutherfordium (Rf) | Zero | | |
| `Chemistry.Element.Dubnium` | The chemical element Dubnium (Db) | Zero | | |
| `Chemistry.Element.Seaborgium` | The chemical element Seaborgium (Sg) | Zero | | |
| `Chemistry.Element.Bohrium` | The chemical element Bohrium (Bh) | Zero | | |
| `Chemistry.Element.Hassium` | The chemical element Hassium (Hs) | Zero | | |
| `Chemistry.Element.Meitnerium` | The chemical element Meitnerium (Mt) | Zero | | |
| `Chemistry.Element.Darmstadtium` | The chemical element Darmstadtium (Ds) | Zero | | |
| `Chemistry.Element.Roentgenium` | The chemical element Roentgenium (Rg) | Zero | | |
| `Chemistry.Element.Copernicium` | The chemical element Copernicium (Cn) | Zero | | |
| `Chemistry.Element.Nihonium` | The chemical element Nihonium (Nh) | Zero | | |
| `Chemistry.Element.Flerovium` | The chemical element Flerovium (Fl) | Zero | | |
| `Chemistry.Element.Moscovium` | The chemical element Moscovium (Mc) | Zero | | |
| `Chemistry.Element.Livermorium` | The chemical element Livermorium (Lv) | Zero | | |
| `Chemistry.Element.Tennessine` | The chemical element Tennessine (Ts) | Zero | | |
| `Chemistry.Element.Oganesson` | The chemical element Oganesson (Og) | Zero | | |
| `Chemistry.Element.Ununennium` | The chemical element Ununennium (Uue) | Zero | | |
| `Chemistry.Element.Unbinilium` | The chemical element Unbinilium (Ubn) | Zero | | |

### Chemistry — Compounds

| Tag | Description | Number of subexpressions | Description of subexpressions | Serialized attributes |
| --- | --- | --- | --- | --- |
| `Chemistry.HomonuclearCompound` | A homonuclear compound: a single element with a subscript count, e.g. H₂ or O₃ | Two | Subexpression 1: the element (a `Chemistry.Element.{ElementName}`); subexpression 2: the atom count (rendered as a subscript) | |
| `Chemistry.HeteronuclearCompound` | A heteronuclear compound: a sequence of two or more elements or homonuclear groups joined without separator, e.g. H₂O; a nested `Chemistry.HeteronuclearCompound` child is automatically wrapped in parentheses | Two or more | Each subexpression is a component of the compound: a `Chemistry.Element.{ElementName}`, a `Chemistry.HomonuclearCompound`, or a parenthesized `Chemistry.HeteronuclearCompound` | |
