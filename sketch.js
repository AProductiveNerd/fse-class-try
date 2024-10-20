let player1, player2;
let platforms = [];
let gravity = 0.6;
let platformWidth = 100;
let platformHeight = 20;
let platformSpacing = 100;
let worldHeight = 3000;
let goalHeight = -2000;
let groundHeight = 20;
let jumpAcceleration = -12;
let attackCooldownTime = 1000;  // Cooldown time in milliseconds (1 second)
let attackDisplacement = 50;    // Base displacement amount for attacks
let dividerWidth = 20;  // Width of the divider between the two views

function setup() {
  createCanvas(820, 800); // Increase the width for the divider (800 + 20px divider)

  // Create two players
  player1 = new Player(150, worldHeight - 50, 'red', 65, 68, 87, 'Z'); // A, D, W for movement, Z for attack
  player2 = new Player(650, worldHeight - 50, 'blue', LEFT_ARROW, RIGHT_ARROW, UP_ARROW, '/'); // Arrow keys for movement, / for attack

  generateInitialPlatforms();
}

function draw() {
  background(200);

  player1.update(player2);
  player2.update(player1);

  displayPlayerView(player1, 0);                 // Left view for Player 1
  displayPlayerView(player2, width / 2 + dividerWidth); // Right view for Player 2

  drawDivider();

  // Check if either player wins
  if (player1.y < goalHeight || player2.y < goalHeight) {
    textSize(32);
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    if (player1.y < goalHeight) {
      text("Player 1 Wins!", width / 2, height / 2);
    } else {
      text("Player 2 Wins!", width / 2, height / 2);
    }
    noLoop(); // Stop the game
  }

  // Generate new platforms as players move upward
  generateNewPlatforms();
}

function displayPlayerView(player, offsetX) {
  // Display the shared world for each player, from their point of view
  push();
  translate(offsetX, 0);           // Move to either the left or right side of the canvas
  let offsetY = height / 2 - player.y;  // Center the player's view vertically
  translate(0, offsetY);           // Scroll the view based on player's position

  for (let platform of platforms) {
    platform.display();
  }

  fill(100);
  rect(0, worldHeight - groundHeight, width / 2 - dividerWidth / 2, groundHeight); // Adjust for split screen (half width minus divider)

  // Draw the player
  player.display();
  pop();
}

function drawDivider() {
  fill(0); // Black divider
  rect(width / 2 - dividerWidth / 2, 0, dividerWidth, height);
}

function generateInitialPlatforms() {
  let y = worldHeight - 100;
  for (let i = 0; i < 20; i++) {
    let x = random(50, width / 2 - platformWidth - dividerWidth / 2 - 50);
    platforms.push(new Platform(x, y, platformWidth, platformHeight));
    y -= platformSpacing;
  }
}

function generateNewPlatforms() {
  // Get the highest platform in the world
  let highestPlatformY = platforms.reduce((min, platform) => Math.min(min, platform.y), Infinity);

  // If the highest platform is  below the players, generate a new one
  if (highestPlatformY > player1.y - height || highestPlatformY > player2.y - height) {
    let newX = random(50, width / 2 - platformWidth - dividerWidth / 2 - 50);
    let newY = highestPlatformY - platformSpacing;
    platforms.push(new Platform(newX, newY, platformWidth, platformHeight));
  }
}

class Player {
  constructor(x, y, color, leftKey, rightKey, jumpKey, attackKey) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 50;
    this.color = color;
    this.speed = 5;
    this.velocityY = 0;
    this.isJumping = false; // Prevent double jumps
    this.leftKey = leftKey;
    this.rightKey = rightKey;
    this.jumpKey = jumpKey;
    this.attackKey = attackKey;  // Attack key (Z or /)
    this.attackCooldown = 0; // Track cooldown timer
    this.freezeTime = 0;  // Track how long the player is frozen for
    this.attackPower = attackDisplacement;  // Track how strong the player's attack is
  }

  update() {
    if (this.freezeTime <= 0) {
      // Horizontal movement
      if (keyIsDown(this.leftKey)) {
        this.x -= this.speed;
      }
      if (keyIsDown(this.rightKey)) {
        this.x += this.speed;
      }
    } else {
      // Reduce freeze timer
      this.freezeTime -= deltaTime;
    }

    // Apply gravity
    this.velocityY += gravity;

    // Collision detection with platforms and the ground
    let onPlatform = false;
    for (let platform of platforms) {
      if (this.x + this.width > platform.x && this.x < platform.x + platform.width) {
        // Check if player is on top of the platform
        if (this.y + this.height <= platform.y && this.y + this.height + this.velocityY > platform.y) {
          this.y = platform.y - this.height;
          this.velocityY = 0;
          this.isJumping = false;
          onPlatform = true;
          break;
        }
        // Check if player is below the platform
        else if (this.y >= platform.y + platform.height && this.y + this.velocityY < platform.y + platform.height) {
          this.y = platform.y + platform.height;
          this.velocityY = 0;
        }
        // Check if player is colliding from the sides
        else if (this.y + this.height > platform.y && this.y < platform.y + platform.height) {
          if (this.x < platform.x) {
            this.x = platform.x - this.width;
          } else {
            this.x = platform.x + platform.width;
          }
        }
      }
    }

    // Apply vertical movement after collision checks
    this.y += this.velocityY;

    // Stop falling through the ground
    if (this.y >= worldHeight - this.height) {
      this.y = worldHeight - this.height;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // Reduce cooldown timer if it's active
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
      if (this.attackCooldown < 0) {
        this.attackCooldown = 0;
      }
    }

    // Ensure the player stays within their screen
    this.x = constrain(this.x, 0, width / 2 - dividerWidth / 2 - this.width);
  }

  attack(otherPlayer) {
    // Only allow attack if cooldown is 0
    if (this.attackCooldown === 0) {
      // Randomly displace the other player on the x-axis
      let displacement = random(-this.attackPower, this.attackPower);  // Use attackPower which can be boosted by power-ups
      otherPlayer.x += displacement;

      // Ensure the displaced player stays within their screen
      if (otherPlayer.x < 0) otherPlayer.x = 0;
      if (otherPlayer.x + otherPlayer.width > width / 2 - dividerWidth / 2) {
        otherPlayer.x = width / 2 - dividerWidth / 2 - otherPlayer.width;
      }

      // Start the cooldown
      this.attackCooldown = attackCooldownTime;
    }
  }

  display() {
    fill(this.color);
    rect(this.x, this.y, this.width, this.height);
  }
}

// Handle key presses for jumping and attacking
function keyPressed() {
  // Player 1 jump (W key)
  if (keyCode === 87 && !player1.isJumping) {
    player1.velocityY = jumpAcceleration;
    player1.isJumping = true;
  }

  // Player 2 jump (Up Arrow)
  if (keyCode === UP_ARROW && !player2.isJumping) {
    player2.velocityY = jumpAcceleration;
    player2.isJumping = true;
  }

  // Player 1 attack (Z key)
  if (keyCode === 90) {
    player1.attack(player2);
  }

  // Player 2 attack (/ key)
  if (keyCode === 191) {
    player2.attack(player1);
  }
}

// Display cooldown timer for a player
function displayCooldownTimer(player, x, y) {
  fill(0);
  textSize(16);
  if (player.attackCooldown > 0) {
    text("Cooldown: " + nf(player.attackCooldown / 1000, 1, 2) + "s", x, y);
  } else {
    text("Ready to attack", x, y);
  }
}

// Platform class
class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  display() {
    fill(0, 150, 0);
    rect(this.x, this.y, this.width, this.height);
  }
}