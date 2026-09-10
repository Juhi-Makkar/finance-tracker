/* Shared category options for the main transaction-entry pages.
   Historical transaction category strings are never changed by this file. */
(function (global) {
  const sortCategories = (categories) => Object.freeze(
    [...new Set(categories)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  );
  const withOtherLast = (categories) => Object.freeze([
    ...sortCategories(categories.filter(category => category !== 'Other' && category !== 'Others')),
    'Other'
  ]);

  global.FinTrackCategories = Object.freeze({
    income: withOtherLast([
      'Salary', 'Freelancing', 'Business', 'Pocket Money', 'Interest', 'Gifts',
      'Refunds', 'Investments', 'YouTube Earnings', 'Rental Income'
    ]),
    expense: withOtherLast([
      'Rent', 'Electricity', 'Water', 'Internet', 'Food', 'Grocery', 'Restaurant',
      'Snacks', 'Bike Petrol', 'Bike Servicing', 'Public Transport', 'Travel',
      'Shopping', 'Clothing', 'Beauty', 'Entertainment', 'YouTube Expenses', 'Netflix',
      'Spotify', 'Subscriptions', 'Medicines', 'Gym', 'Doctor', 'Books', 'Courses',
      'Loan', 'Miscellaneous'
    ])
  });
})(window);
