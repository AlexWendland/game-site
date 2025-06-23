/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  WizardBidSelection,
  BidSelectionPresenter,
} from "../components/wizard/WizardBidSelection";

// Mock function to track calls
const mockMakeBid = jest.fn();

// Mock the entire WizardContext module
jest.mock("../components/wizard/WizardContext", () => ({
  useWizardBidSelectionContext: jest.fn(),
}));

// Get the mocked function for type safety
const mockUseWizardBidSelectionContext =
  require("../components/wizard/WizardContext").useWizardBidSelectionContext;

// Helper function to render component with mocked context
const renderWithContext = (contextValue: any) => {
  mockUseWizardBidSelectionContext.mockReturnValue(contextValue);
  return render(<WizardBidSelection />);
};

describe("BidSelectionPresenter", () => {
  beforeEach(() => {
    mockMakeBid.mockClear();
  });

  const defaultProps = {
    validBids: [0, 1, 2, 3],
    roundNumber: 3,
    selectSuit: false,
    makeBid: mockMakeBid,
  };

  describe("Basic Rendering", () => {
    test("renders bid selection for round 3", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      expect(
        screen.getByText("Select your bid for round 3"),
      ).toBeInTheDocument();
    });

    test("renders all bid buttons for the round", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    test("does not render when no valid bids", () => {
      const propsWithNoBids = { ...defaultProps, validBids: [] };
      const { container } = render(
        <BidSelectionPresenter {...propsWithNoBids} />,
      );

      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe("Bid Selection", () => {
    test("enables only valid bid buttons", () => {
      const propsWithLimitedBids = {
        ...defaultProps,
        validBids: [0, 2],
      };
      render(<BidSelectionPresenter {...propsWithLimitedBids} />);

      const bid0 = screen.getByText("0");
      const bid1 = screen.getByText("1");
      const bid2 = screen.getByText("2");
      const bid3 = screen.getByText("3");

      expect(bid0).not.toBeDisabled();
      expect(bid1).toBeDisabled();
      expect(bid2).not.toBeDisabled();
      expect(bid3).toBeDisabled();
    });

    test("selects bid when clicked", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      const bid2Button = screen.getByText("2");
      fireEvent.click(bid2Button);

      expect(bid2Button).toHaveClass("bg-blue-300");
    });

    test("calls makeBid with correct values when confirmed", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      const bid2Button = screen.getByText("2");
      fireEvent.click(bid2Button);

      const confirmButton = screen.getByText("Confirm bid");
      fireEvent.click(confirmButton);

      expect(mockMakeBid).toHaveBeenCalledWith(2, null);
    });
  });

  describe("Suit Selection", () => {
    const propsWithSuitSelection = {
      ...defaultProps,
      selectSuit: true,
    };

    test("shows suit selection when required", () => {
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      expect(screen.getByText("Select trump suit")).toBeInTheDocument();
      expect(screen.getByText("No trump")).toBeInTheDocument();
      expect(screen.getByText("Red")).toBeInTheDocument();
      expect(screen.getByText("Blue")).toBeInTheDocument();
      expect(screen.getByText("Green")).toBeInTheDocument();
      expect(screen.getByText("Yellow")).toBeInTheDocument();
    });

    test("does not show suit selection when not required", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      expect(screen.queryByText("Select trump suit")).not.toBeInTheDocument();
    });

    test("selects suit when clicked", () => {
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      const redSuitButton = screen.getByText("Red");
      fireEvent.click(redSuitButton);

      expect(redSuitButton).toHaveClass("bg-green-300");
    });

    test("calls makeBid with bid and suit when both selected", () => {
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      const bid2Button = screen.getByText("2");
      fireEvent.click(bid2Button);

      const blueSuitButton = screen.getByText("Blue");
      fireEvent.click(blueSuitButton);

      const confirmButton = screen.getByText("Confirm bid");
      fireEvent.click(confirmButton);

      expect(mockMakeBid).toHaveBeenCalledWith(2, 1);
    });

    test("calls makeBid with No trump suit (value -1)", () => {
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      const bid1Button = screen.getByText("1");
      fireEvent.click(bid1Button);

      const noTrumpButton = screen.getByText("No trump");
      fireEvent.click(noTrumpButton);

      const confirmButton = screen.getByText("Confirm bid");
      fireEvent.click(confirmButton);

      expect(mockMakeBid).toHaveBeenCalledWith(1, -1);
    });
  });

  describe("Submit Button Behavior", () => {
    test("disables confirm button when no bid selected", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm bid");
      expect(confirmButton).toBeDisabled();
    });

    test("enables confirm button when bid selected and no suit required", () => {
      render(<BidSelectionPresenter {...defaultProps} />);

      const bid1Button = screen.getByText("1");
      fireEvent.click(bid1Button);

      const confirmButton = screen.getByText("Confirm bid");
      expect(confirmButton).not.toBeDisabled();
    });

    test("disables confirm button when bid selected but suit required and not selected", () => {
      const propsWithSuitSelection = {
        ...defaultProps,
        selectSuit: true,
      };
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      const bid1Button = screen.getByText("1");
      fireEvent.click(bid1Button);

      const confirmButton = screen.getByText("Confirm bid");
      expect(confirmButton).toBeDisabled();
    });

    test("enables confirm button when both bid and suit selected", () => {
      const propsWithSuitSelection = {
        ...defaultProps,
        selectSuit: true,
      };
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      const bid1Button = screen.getByText("1");
      fireEvent.click(bid1Button);

      const redSuitButton = screen.getByText("Red");
      fireEvent.click(redSuitButton);

      const confirmButton = screen.getByText("Confirm bid");
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe("State Reset After Submission", () => {
    test("resets selected bid and suit after successful submission", () => {
      const propsWithSuitSelection = {
        ...defaultProps,
        selectSuit: true,
      };
      render(<BidSelectionPresenter {...propsWithSuitSelection} />);

      const bid2Button = screen.getByText("2");
      const greenSuitButton = screen.getByText("Green");

      fireEvent.click(bid2Button);
      fireEvent.click(greenSuitButton);

      expect(bid2Button).toHaveClass("bg-blue-300");
      expect(greenSuitButton).toHaveClass("bg-green-300");

      const confirmButton = screen.getByText("Confirm bid");
      fireEvent.click(confirmButton);

      expect(bid2Button).not.toHaveClass("bg-blue-300");
      expect(greenSuitButton).not.toHaveClass("bg-green-300");
    });
  });
});

describe("WizardBidSelection (Container)", () => {
  beforeEach(() => {
    mockMakeBid.mockClear();
  });

  const defaultContext = {
    validBids: [0, 1, 2, 3],
    roundNumber: 3,
    makeBid: mockMakeBid,
    selectSuit: false,
  };

  test("passes context values to presenter", () => {
    renderWithContext(defaultContext);

    expect(screen.getByText("Select your bid for round 3")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("calls context makeBid when presenter triggers makeBid", () => {
    renderWithContext(defaultContext);

    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("Confirm bid"));

    expect(mockMakeBid).toHaveBeenCalledWith(2, null);
  });
});
