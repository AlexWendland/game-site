import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  getKeyValue,
} from "@heroui/react";
import { useWizardScoreSheetContext } from "./WizardContext";
import { RoundResult } from "@/types/gameTypes";

export function WizardScoreSheet() {
  const {
    scoreSheet,
    roundNumber,
    maxRounds,
    roundBids,
    players,
    maxPlayers,
    totalScore,
  } = useWizardScoreSheetContext();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  function renderRoundResult(roundResult: RoundResult) {
    const tricksColor =
      roundResult.bid === null
        ? "text-gray-300"
        : roundResult.tricks_won < roundResult.bid
          ? "text-blue-300"
          : roundResult.tricks_won > roundResult.bid
            ? "text-red-300"
            : "text-green-300";

    const scoreColor =
      roundResult.score < 0 ? "text-red-300" : "text-green-300";

    return (
      <div className="grid grid-cols-1 justify-items-center">
        <div>
          <span className="text-gray-500 text-md">{roundResult.bid}</span>{" "}
          <span className="text-gray-500 text-sm">/</span>{" "}
          <span className={`${tricksColor} text-md`}>
            {roundResult.tricks_won}
          </span>
        </div>
        <div className={`text-lg ${scoreColor}`}>{roundResult.score}</div>
      </div>
    );
  }

  function renderCurrentRoundResult(bid: number | null) {
    const displayBid = bid ?? "-";
    return (
      <div>
        <span className="text-gray-500 text-md">{displayBid}</span>{" "}
        <span className="text-gray-500 text-sm">/</span>{" "}
        <span className={`text-gray-500 text-md`}>-</span>
      </div>
    );
  }

  const columnHeaders = [
    {
      key: "round",
      value: "Round",
    },
  ];

  for (let player = 0; player < maxPlayers; player++) {
    columnHeaders.push({
      key: `player_${player}`,
      value: players[player] ?? `Player ${player + 1}`,
    });
  }

  function getPlayerColumnKey(position: number) {
    return `player_${position}`;
  }

  const rows: Record<string, any>[] = [];

  // Completed rounds (0 to roundNumber - 1)
  // Assuming scoreSheet is 0-indexed for rounds
  for (let roundIdx = 1; roundIdx < roundNumber; roundIdx++) {
    // Iterate up to roundNumber (exclusive)
    const rowData: Record<string, any> = {
      round: roundIdx, // Display round number starting from 1
    };
    for (let position = 0; position < maxPlayers; position++) {
      const playerColumnKey = getPlayerColumnKey(position);
      rowData[playerColumnKey] = renderRoundResult(
        scoreSheet[position][roundIdx],
      );
    }
    rows.push(rowData);
  }

  // Current round (roundNumber)
  if (roundNumber <= maxRounds) {
    // Ensure current round is within game limits
    const currentRoundData: Record<string, any> = {
      round: roundNumber,
    };
    for (let position = 0; position < maxPlayers; position++) {
      const playerColumnKey = getPlayerColumnKey(position);
      currentRoundData[playerColumnKey] = renderCurrentRoundResult(
        roundBids[position],
      );
    }
    rows.push(currentRoundData);
  }

  // Future rounds (if any)
  for (
    let futureRoundNum = roundNumber + 1;
    futureRoundNum <= maxRounds;
    futureRoundNum++
  ) {
    const futureRoundData: Record<string, any> = {
      round: futureRoundNum,
    };
    for (let position = 0; position < maxPlayers; position++) {
      const playerColumnKey = getPlayerColumnKey(position);
      futureRoundData[playerColumnKey] = "-"; // Placeholder for future rounds
    }
    rows.push(futureRoundData);
  }

  // Total row
  const totalRowData: Record<string, any> = {
    round: "Total",
  };
  for (let position = 0; position < maxPlayers; position++) {
    const playerColumnKey = getPlayerColumnKey(position);
    totalRowData[playerColumnKey] = (
      <div className="text-lg font-bold">{totalScore[position] ?? "-"}</div>
    );
  }
  rows.push(totalRowData);

  return (
    <>
      <Button onPress={onOpen}>Scores</Button>
      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="top"
      >
        <ModalContent className="bg-gray-200">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Score Sheet
              </ModalHeader>
              <ModalBody>
                <Table
                  aria-label="Wizard Score Sheet"
                  isStriped
                  className="bg-gray-200"
                >
                  <TableHeader columns={columnHeaders}>
                    {(columnKey) => (
                      <TableColumn key={columnKey.key} align="center">
                        {columnKey.value}
                      </TableColumn>
                    )}
                  </TableHeader>
                  <TableBody items={rows}>
                    {(item) => (
                      <TableRow key={item.round}>
                        {(columnKey) => (
                          <TableCell>{getKeyValue(item, columnKey)}</TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
