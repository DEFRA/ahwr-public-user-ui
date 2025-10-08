import { getAllByRole } from "@testing-library/dom";

export const getTableCells = (element) =>
  getAllByRole(element, "row").map((row, index) => {
    const type = index === 0 ? "columnheader" : "cell";
    return getAllByRole(row, type).map((cell) => cell.textContent.trim());
  });
