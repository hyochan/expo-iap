#!/bin/bash

echo "Running tests with coverage..."

# Run main tests
echo "Running main library tests..."
bun test --coverage

# Run example tests
echo "Running example app tests..."
cd example
bun test --coverage --passWithNoTests
cd ..

echo "Coverage reports generated in ./coverage and ./example/coverage"